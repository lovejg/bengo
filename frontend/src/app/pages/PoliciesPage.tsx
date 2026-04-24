import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { getPolicies } from '../api/policies';
import { ApiClientError, getAccessToken, getStoredUserProfile } from '../api/client';
import { MainLayout } from '../components/templates/MainLayout';
import { SearchBar } from '../components/molecules/SearchBar';
import { SortDropdown, SortOption } from '../components/molecules/SortDropdown';
import { AppliedFiltersRow } from '../components/molecules/AppliedFiltersRow';
import { PolicyList } from '../components/organisms/PolicyList';
import { ExpandableFilters, ExpandableFiltersState } from '../components/organisms/ExpandableFilters';
import { EmptyState } from '../components/molecules/EmptyState';
import { PolicyCardSkeleton } from '../components/molecules/PolicyCardSkeleton';
import { Button } from '../components/atoms/Button';
import type { PolicyListItem, RegionCode } from '../types';
import { REGION_LABELS } from '../lib/regions';

const PAGE_SIZE = 12;

const EMPTY_FILTERS: ExpandableFiltersState = {
  categories: [],
  regions: [],
  ages: [],
  employmentStatuses: [],
};

// Temporary labels for detailed filter density/visibility testing.
// Keep in sync with TEMP_VISIBILITY_TEST_OPTIONS in ExpandableFilters.tsx.
const TEMP_VISIBILITY_TEST_LABELS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 7 }, (_, index) => {
    const number = index + 1;
    return [`temp_visibility_test_${number}`, `테스트 ${number}`];
  }),
);

// 칩 표시용 라벨 맵 (ExpandableFilters 실제 옵션 id 기준)
const CATEGORY_LABELS: Record<string, string> = {
  youth_policy: '청년정책',
  childcare_policy: '육아정책',
  ...TEMP_VISIBILITY_TEST_LABELS,
};
const FILTER_REGION_LABELS: Record<string, string> = { ...REGION_LABELS, ...TEMP_VISIBILITY_TEST_LABELS };
const AGE_LABELS: Record<string, string> = {
  '19-24': '19-24세', '25-29': '25-29세', '30-34': '30-34세',
  ...TEMP_VISIBILITY_TEST_LABELS,
};
const EMPLOYMENT_LABELS: Record<string, string> = {
  student: '학생', jobseeker: '구직자', employed: '재직자',
  ...TEMP_VISIBILITY_TEST_LABELS,
};
type StatusFilter = 'recruiting' | 'always' | 'period_raw' | 'unknown';

const DAY_MS = 24 * 60 * 60 * 1000;
const SORT_OPTIONS = new Set<SortOption>(['latest', 'deadline', 'recommended']);

function getSortOption(value: string | null): SortOption {
  return value && SORT_OPTIONS.has(value as SortOption) ? (value as SortOption) : 'latest';
}

function getTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : null;
}

function isClosedPolicy(policy: PolicyListItem, now = Date.now()) {
  const endsAt = getTime(policy.endsAt);
  return endsAt !== null && endsAt < now;
}

function getDeadlineRank(policy: PolicyListItem, now = Date.now()) {
  if (isClosedPolicy(policy, now)) return 4;
  if (!policy.isAlwaysOpen && policy.endsAt) return 0;
  if (policy.isAlwaysOpen) return 1;
  if (policy.periodRaw) return 2;
  return 3;
}

function sortPoliciesByLatest(policies: PolicyListItem[]) {
  return policies;
}

function sortPoliciesByDeadline(policies: PolicyListItem[], now = Date.now()) {
  return [...policies].sort((a, b) => {
    const aRank = getDeadlineRank(a, now);
    const bRank = getDeadlineRank(b, now);
    if (aRank !== bRank) return aRank - bRank;

    if (aRank === 0) {
      return (getTime(a.endsAt) ?? Number.MAX_SAFE_INTEGER) - (getTime(b.endsAt) ?? Number.MAX_SAFE_INTEGER);
    }

    if (aRank === 4) {
      return (getTime(b.endsAt) ?? 0) - (getTime(a.endsAt) ?? 0);
    }

    return 0;
  });
}

function stableExplorationOffset(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 997;
  }
  return (hash % 17) / 10;
}

function getRecommendedScore(policy: PolicyListItem) {
  const user = getStoredUserProfile();
  if (!user) return 0;

  let score = 0;
  if (policy.categories.some((category) => user.interests.includes(category))) score += 42;
  if (policy.regionCodes.includes(user.regionCode)) score += 26;
  if (
    (policy.minAge === null || user.age >= policy.minAge) &&
    (policy.maxAge === null || user.age <= policy.maxAge)
  ) {
    score += 22;
  }

  const deadlineRank = getDeadlineRank(policy);
  if (deadlineRank === 0) score += 8;
  else if (deadlineRank === 1) score += 5;
  else if (deadlineRank === 2) score += 2;
  else if (deadlineRank === 4) score -= 20;

  const deadline = getTime(policy.endsAt);
  if (deadline && deadline > Date.now()) {
    score += Math.max(0, 4 - Math.floor((deadline - Date.now()) / (30 * DAY_MS)));
  }

  return score + stableExplorationOffset(policy.id);
}

function sortPoliciesByRecommended(policies: PolicyListItem[]) {
  return [...policies].sort((a, b) => {
    const scoreDiff = getRecommendedScore(b) - getRecommendedScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.title.localeCompare(b.title, 'ko');
  });
}

function sortPoliciesForView(policies: PolicyListItem[], sortBy: SortOption) {
  if (sortBy === 'deadline') return sortPoliciesByDeadline(policies);
  if (sortBy === 'recommended') return sortPoliciesByRecommended(policies);
  return sortPoliciesByLatest(policies);
}

export function PoliciesPage() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuthenticated = Boolean(getAccessToken() && getStoredUserProfile());
  const sortParam = getSortOption(searchParams.get('sort'));
  const sortBy: SortOption = !isAuthenticated && sortParam === 'recommended' ? 'latest' : sortParam;

  // ── 필터 상태 ──────────────────────────────────────────────────────────────
  // committedFilters: Apply 확정값 (API 호출 기준, chips 기준)
  const [committedFilters, setCommittedFilters] = useState<ExpandableFiltersState>(EMPTY_FILTERS);
  // 패널 내 조작 중인 임시값 (ref: state 업데이트 없이 추적 → Apply 전 API 호출 없음)
  const pendingFiltersRef = useRef<ExpandableFiltersState>(EMPTY_FILTERS);
  const [isExpandableFiltersOpen, setIsExpandableFiltersOpen] = useState(false);

  // ── appliedFilters: committedFilters에서 파생 (state 아님) ──────────────────
  const appliedFilters = useMemo(() => {
    const chips: Array<{ id: string; label: string; value: string }> = [];

    committedFilters.categories.forEach((id) =>
      chips.push({ id, label: '카테고리', value: CATEGORY_LABELS[id] ?? id })
    );
    committedFilters.regions
      .filter((r) => r !== 'all')
      .forEach((r) => chips.push({ id: `region-${r}`, label: '지역', value: FILTER_REGION_LABELS[r] ?? r }));
    committedFilters.ages
      .filter((a) => a !== 'all')
      .forEach((a) => chips.push({ id: `age-${a}`, label: '나이대', value: AGE_LABELS[a] ?? a }));
    committedFilters.employmentStatuses
      .filter((s) => s !== 'all')
      .forEach((s) => chips.push({ id: `employment-${s}`, label: '취업상태', value: EMPLOYMENT_LABELS[s] ?? s }));
    return chips;
  }, [committedFilters]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingScrollRestore, setPendingScrollRestore] = useState<number | null>(null);
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const searchQuery = searchParams.get('search') ?? '';
  const statusFilter = (searchParams.get('status') as StatusFilter | null) ?? null;
  const typeFilter = (searchParams.get('type') as 'application' | 'info' | null) ?? null;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

  const setStatusFilter = (val: StatusFilter | null | ((prev: StatusFilter | null) => StatusFilter | null)) => {
    setSearchParams((prev) => {
      const next = typeof val === 'function' ? val(statusFilter) : val;
      if (next) prev.set('status', next); else prev.delete('status');
      prev.set('page', '1');
      return prev;
    }, { replace: true });
    scrollToTop();
  };

  const setTypeFilter = (val: 'application' | 'info' | null | ((prev: 'application' | 'info' | null) => 'application' | 'info' | null)) => {
    setSearchParams((prev) => {
      const next = typeof val === 'function' ? val(typeFilter) : val;
      if (next) prev.set('type', next); else prev.delete('type');
      prev.set('page', '1');
      return prev;
    }, { replace: true });
    scrollToTop();
  };

  const setCurrentPage = (page: number) => {
    setSearchParams((prev) => { prev.set('page', String(page)); return prev; }, { replace: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSortChange = (nextSort: SortOption) => {
    setSearchParams((prev) => {
      if (nextSort === 'latest') prev.delete('sort');
      else prev.set('sort', nextSort);
      prev.set('page', '1');
      return prev;
    }, { replace: true });
    scrollToTop();
  };

  useEffect(() => {
    if (navigationType !== 'POP') return;
    const key = `scroll:${location.pathname}${location.search}`;
    const saved = window.sessionStorage.getItem(key);
    if (!saved) return;
    setPendingScrollRestore(Number(saved));
  }, [location.pathname, location.search, navigationType]);

  useEffect(() => {
    if (navigationType !== 'POP' || pendingScrollRestore === null || isLoading) return;
    let attempts = 0;
    let frame = 0;
    const restore = () => {
      attempts += 1;
      window.scrollTo({ top: pendingScrollRestore, behavior: 'instant' });
      const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
      const reached = Math.abs(window.scrollY - pendingScrollRestore) < 4 || maxScrollTop >= pendingScrollRestore;
      if (reached || attempts >= 20) { setPendingScrollRestore(null); return; }
      frame = window.requestAnimationFrame(restore);
    };
    frame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, navigationType, pendingScrollRestore]);

  // ── API: committedFilters 확정 후에만 호출 ──────────────────────────────────
  useEffect(() => {
    const loadPolicies = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const rawRegion = committedFilters.regions.find((r) => r !== 'all');
        const selectedRegion = rawRegion ? (rawRegion as RegionCode) : undefined;
        const selectedInterest = committedFilters.categories[0] as 'youth_policy' | 'childcare_policy' | undefined;
        const apiSortBy = sortBy === 'recommended' ? 'latest' : sortBy;
        const response = await getPolicies({
          search: searchQuery || undefined,
          sortBy: apiSortBy,
          order: 'desc',
          regionCode: selectedRegion,
          interest: selectedInterest,
        });
        setPolicies(response.items);
      } catch (error) {
        setHasError(true);
        const message = error instanceof ApiClientError ? error.message : '정책 목록을 불러오는데 실패했습니다';
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };
    loadPolicies();
  }, [searchQuery, sortBy, committedFilters, reloadKey]);

  useEffect(() => {
    if (!isAuthenticated && sortParam === 'recommended') {
      setSearchParams((prev) => {
        prev.delete('sort');
        prev.set('page', '1');
        return prev;
      }, { replace: true });
    }
  }, [isAuthenticated, setSearchParams, sortParam]);

  // ── 핸들러 ─────────────────────────────────────────────────────────────────

  const handleSearch = (query: string) => {
    setSearchParams((prev) => {
      if (query) prev.set('search', query); else prev.delete('search');
      prev.set('page', '1');
      return prev;
    }, { replace: true });
    scrollToTop();
  };

  // 패널 내 조작: ref에만 저장 (state 갱신 없음 → API 호출 없음)
  const handleExpandableFiltersChange = useCallback((filters: ExpandableFiltersState) => {
    pendingFiltersRef.current = filters;
  }, []);

  // Apply: pending → committed 확정
  const handleApplyExpandableFilters = () => {
    const pending = pendingFiltersRef.current;
    setCommittedFilters(pending);
    setIsExpandableFiltersOpen(false);
    setCurrentPage(1);
    const count =
      pending.categories.length +
      pending.regions.filter((r) => r !== 'all').length +
      pending.ages.filter((a) => a !== 'all').length +
      pending.employmentStatuses.filter((s) => s !== 'all').length;
    if (count > 0) toast.success('필터가 적용되었습니다');
    scrollToTop();
  };

  // 칩 X: prefix 파싱으로 해당 원천 state만 수정
  const handleRemoveFilter = (id: string) => {
    if (id.startsWith('region-')) {
      const val = id.slice('region-'.length);
      setCommittedFilters((prev) => ({ ...prev, regions: prev.regions.filter((r) => r !== val) }));
    } else if (id.startsWith('age-')) {
      const val = id.slice('age-'.length);
      setCommittedFilters((prev) => ({ ...prev, ages: prev.ages.filter((a) => a !== val) }));
    } else if (id.startsWith('employment-')) {
      const val = id.slice('employment-'.length);
      setCommittedFilters((prev) => ({ ...prev, employmentStatuses: prev.employmentStatuses.filter((s) => s !== val) }));
    } else {
      // 카테고리 칩
      setCommittedFilters((prev) => ({ ...prev, categories: prev.categories.filter((c) => c !== id) }));
    }
  };

  // 전체 초기화
  const handleClearAll = () => {
    setCommittedFilters(EMPTY_FILTERS);
    pendingFiltersRef.current = EMPTY_FILTERS;
    toast.info('모든 필터가 초기화되었습니다');
    scrollToTop();
  };

  const handleRetry = () => setReloadKey((current) => current + 1);

  const now = Date.now();
  const recruitingCount = policies.filter(p => !p.isAlwaysOpen && p.endsAt && new Date(p.endsAt).getTime() >= now).length;
  const alwaysOpenCount = policies.filter(p => p.isAlwaysOpen).length;
  const periodRawCount = policies.filter(p => !p.isAlwaysOpen && !p.endsAt && !!p.periodRaw).length;
  const unknownCount = policies.filter(p => !p.isAlwaysOpen && !p.endsAt && !p.periodRaw).length;
  const filteredPolicies = sortPoliciesForView(
    policies
      .filter(p => {
      if (!statusFilter) return true;
      if (statusFilter === 'recruiting') return !p.isAlwaysOpen && !!p.endsAt && new Date(p.endsAt).getTime() >= now;
      if (statusFilter === 'always') return p.isAlwaysOpen;
      if (statusFilter === 'period_raw') return !p.isAlwaysOpen && !p.endsAt && !!p.periodRaw;
      if (statusFilter === 'unknown') return !p.isAlwaysOpen && !p.endsAt && !p.periodRaw;
      return true;
      })
      .filter(p => !typeFilter || (p as any).policyType === typeFilter),
    sortBy,
  );

  return (
    <MainLayout>
      <div className="bg-white/80 backdrop-blur-sm border-b border-[var(--border)] md:sticky md:top-16 md:z-40 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6 space-y-3 md:space-y-4">
          {/* Title + Stats */}
          {!isLoading && !hasError && policies.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] mb-1">
                어떤 정책을 찾고 계신가요?
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-[var(--muted-foreground)]">
                  총 <span className="font-semibold text-[var(--foreground)]">{policies.length}개</span>의 정책을 찾았어요 ✨
                </p>
                <div className="flex items-center gap-2 text-xs">
                  {recruitingCount > 0 && (
                    <button type="button" onClick={() => setStatusFilter(p => p === 'recruiting' ? null : 'recruiting')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all cursor-pointer ${statusFilter === 'recruiting' ? 'bg-emerald-200 border-emerald-400 text-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:opacity-80'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      모집중 {recruitingCount}
                    </button>
                  )}
                  {alwaysOpenCount > 0 && (
                    <button type="button" onClick={() => setStatusFilter(p => p === 'always' ? null : 'always')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all cursor-pointer ${statusFilter === 'always' ? 'bg-blue-200 border-blue-400 text-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200 hover:opacity-80'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      상시 {alwaysOpenCount}
                    </button>
                  )}
                  {periodRawCount > 0 && (
                    <button type="button" onClick={() => setStatusFilter(p => p === 'period_raw' ? null : 'period_raw')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all cursor-pointer ${statusFilter === 'period_raw' ? 'bg-amber-200 border-amber-400 text-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200 hover:opacity-80'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                      별도 확인 {periodRawCount}
                    </button>
                  )}
                  {unknownCount > 0 && (
                    <button type="button" onClick={() => setStatusFilter(p => p === 'unknown' ? null : 'unknown')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all cursor-pointer ${statusFilter === 'unknown' ? 'bg-red-200 border-red-400 text-red-800' : 'bg-red-50 text-red-700 border-red-200 hover:opacity-80'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      기간확인불가 {unknownCount}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <SearchBar key={searchQuery} onSearch={handleSearch} defaultValue={searchQuery} />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <SortDropdown value={sortBy} onChange={handleSortChange} showRecommended={isAuthenticated} />
              <Button
                variant={isExpandableFiltersOpen ? 'primary' : 'secondary'}
                className={`gap-2 ${isExpandableFiltersOpen ? 'shadow-md' : ''}`}
                onClick={() => setIsExpandableFiltersOpen(!isExpandableFiltersOpen)}
                aria-label="필터 열기"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline font-semibold">상세 필터</span>
              </Button>
            </div>
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter(p => p === 'application' ? null : 'application')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${typeFilter === 'application' ? 'bg-violet-500 text-white border-violet-500' : 'bg-violet-50 text-violet-700 border-violet-200 hover:opacity-80'}`}
            >
              신청형
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter(p => p === 'info' ? null : 'info')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer ${typeFilter === 'info' ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50 text-orange-700 border-orange-200 hover:opacity-80'}`}
            >
              정보형
            </button>
          </div>

          {/* Expandable Filters
              AnimatePresence 조건부 렌더링으로 패널 열릴 때마다 remount
              → defaultValue={committedFilters}로 확정값 기준 초기화
              → 닫기(취소) 시 pending 변경사항 자동 폐기 */}
          <AnimatePresence>
            {isExpandableFiltersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <ExpandableFilters
                    defaultValue={committedFilters}
                    onChange={handleExpandableFiltersChange}
                    onApply={handleApplyExpandableFilters}
                    variant="tabs"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Applied Filters */}
          {appliedFilters.length > 0 && (
            <AppliedFiltersRow
              filters={appliedFilters}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearAll}
            />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {!isLoading && !hasError && policies.length > 0 && (
          <div className="mb-6">
            <p className="text-[var(--muted-foreground)]">
              총 <span className="text-[var(--foreground)] font-semibold">{filteredPolicies.length}개</span>의 정책
              {Math.ceil(filteredPolicies.length / PAGE_SIZE) > 1 && (
                <span> · {currentPage}/{Math.ceil(filteredPolicies.length / PAGE_SIZE)} 페이지</span>
              )}
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              role="status"
              aria-label="정책 목록 로딩 중"
            >
              {[...Array(6)].map((_, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.05 }}>
                  <PolicyCardSkeleton />
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && hasError && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <EmptyState type="error" onAction={handleRetry} actionLabel="다시 시도" />
            </motion.div>
          )}

          {!isLoading && !hasError && filteredPolicies.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <EmptyState type="noResult" onAction={handleClearAll} actionLabel="필터 초기화" />
            </motion.div>
          )}

          {!isLoading && !hasError && filteredPolicies.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col min-h-[800px]"
            >
              <div className="flex-1">
                <PolicyList
                  policies={filteredPolicies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
                  hasMore={false}
                />
              </div>
              {Math.ceil(filteredPolicies.length / PAGE_SIZE) > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button variant="secondary" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                    이전
                  </Button>
                  <span className="text-sm text-[var(--muted-foreground)] px-2">
                    {currentPage} / {Math.ceil(filteredPolicies.length / PAGE_SIZE)}
                  </span>
                  <Button variant="secondary" onClick={() => setCurrentPage(Math.min(Math.ceil(filteredPolicies.length / PAGE_SIZE), currentPage + 1))} disabled={currentPage === Math.ceil(filteredPolicies.length / PAGE_SIZE)}>
                    다음
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}

export default PoliciesPage;

import { useState, useEffect } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { getPolicies } from '../api/policies';
import { ApiClientError } from '../api/client';
import { MainLayout } from '../components/templates/MainLayout';
import { SearchBar } from '../components/molecules/SearchBar';
import { SortDropdown, SortOption } from '../components/molecules/SortDropdown';
import { FilterChipGroup } from '../components/molecules/FilterChipGroup';
import { AppliedFiltersRow } from '../components/molecules/AppliedFiltersRow';
import { PolicyList } from '../components/organisms/PolicyList';
import { ExpandableFilters, ExpandableFiltersState } from '../components/organisms/ExpandableFilters';
import { EmptyState } from '../components/molecules/EmptyState';
import { PolicyCardSkeleton } from '../components/molecules/PolicyCardSkeleton';
import { Button } from '../components/atoms/Button';
import type { PolicyListItem, RegionCode } from '../types';

const PAGE_SIZE = 12;

const quickFilters = [
  { id: 'youth_policy', label: '청년정책' },
  { id: 'childcare_policy', label: '육아정책' },
];

type StatusFilter = 'recruiting' | 'always' | 'period_raw' | 'unknown';

export function PoliciesPage() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [isExpandableFiltersOpen, setIsExpandableFiltersOpen] = useState(false);
  const [expandableFilters, setExpandableFilters] = useState<ExpandableFiltersState>({
    regions: [],
    ages: [],
    employmentStatuses: [],
    recruitStatuses: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [policies, setPolicies] = useState<PolicyListItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingScrollRestore, setPendingScrollRestore] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const searchQuery = searchParams.get('search') ?? '';
  const statusFilter = (searchParams.get('status') as StatusFilter | null) ?? null;
  const typeFilter = (searchParams.get('type') as 'application' | 'info' | null) ?? null;
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

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

  useEffect(() => {
    if (navigationType !== 'POP') {
      return;
    }

    const key = `scroll:${location.pathname}${location.search}`;
    const saved = window.sessionStorage.getItem(key);
    if (!saved) {
      return;
    }
    setPendingScrollRestore(Number(saved));
  }, [location.pathname, location.search, navigationType]);

  useEffect(() => {
    if (navigationType !== 'POP' || pendingScrollRestore === null || isLoading) {
      return;
    }

    let attempts = 0;
    let frame = 0;

    const restore = () => {
      attempts += 1;
      window.scrollTo({ top: pendingScrollRestore, behavior: 'instant' });

      const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
      const reached =
        Math.abs(window.scrollY - pendingScrollRestore) < 4 ||
        maxScrollTop >= pendingScrollRestore;

      if (reached || attempts >= 20) {
        setPendingScrollRestore(null);
        return;
      }

      frame = window.requestAnimationFrame(restore);
    };

    frame = window.requestAnimationFrame(restore);

    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, navigationType, pendingScrollRestore]);

  useEffect(() => {
    const loadPolicies = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const rawRegion = expandableFilters.regions[0];
        const selectedRegion = rawRegion && rawRegion !== 'all' ? (rawRegion as RegionCode) : undefined;
        const selectedInterest = selectedFilters[0] as 'youth_policy' | 'childcare_policy' | undefined;
        const apiSortBy = sortBy === 'recommended' ? 'relevance' : sortBy;
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
  }, [searchQuery, sortBy, selectedFilters, expandableFilters, reloadKey]);

  const handleSearch = (query: string) => {
    setSearchParams((prev) => {
      if (query) prev.set('search', query); else prev.delete('search');
      prev.set('page', '1');
      return prev;
    }, { replace: true });
    scrollToTop();
  };

  const handleFilterChange = (filters: string[]) => {
    setCurrentPage(1);
    setSelectedFilters(filters);
    const applied = filters.map((id) => ({
      id,
      label: id,
      value: quickFilters.find((f) => f.id === id)?.label || id,
    }));
    setAppliedFilters(applied);
    
    if (filters.length > 0) {
      toast.success('필터가 적용되었습니다');
    }

    scrollToTop();
  };

  const handleRemoveFilter = (id: string) => {
    setSelectedFilters(selectedFilters.filter((f) => f !== id));
    setAppliedFilters(appliedFilters.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    setSelectedFilters([]);
    setAppliedFilters([]);
    setExpandableFilters({
      regions: [],
      ages: [],
      employmentStatuses: [],
      recruitStatuses: [],
    });
    toast.info('모든 필터가 초기화되었습니다');
    scrollToTop();
  };

  const handleExpandableFiltersChange = (filters: ExpandableFiltersState) => {
    setExpandableFilters(filters);
  };

  const handleApplyExpandableFilters = () => {
    const newFilters: Array<{ id: string; label: string; value: string }> = [];
    
    // 지역 필터
    expandableFilters.regions.forEach((region) => {
      const labels: Record<string, string> = {
        seoul: '서울',
        busan: '부산',
        daegu: '대구',
        incheon: '인천',
        gwangju: '광주',
        daejeon: '대전',
        ulsan: '울산',
        sejong: '세종',
        gyeonggi: '경기',
      };
      newFilters.push({ id: `region-${region}`, label: '지역', value: labels[region] || region });
    });

    // 연령 필터
    expandableFilters.ages.forEach((age) => {
      const labels: Record<string, string> = {
        '10s': '10대',
        '20s': '20대',
        '30s': '30대',
        '40s': '40대',
        '50s': '50대',
        '60plus': '60대 이상',
      };
      newFilters.push({ id: `age-${age}`, label: '연령', value: labels[age] || age });
    });

    // 취업상태 필터
    expandableFilters.employmentStatuses.forEach((status) => {
      const labels: Record<string, string> = {
        employed: '재직자',
        unemployed: '구직자',
        entrepreneur: '사업자',
        student: '학생',
        freelancer: '프리랜서',
        etc: '기타',
      };
      newFilters.push({ id: `employment-${status}`, label: '취업상태', value: labels[status] || status });
    });

    // 모집상태 필터
    expandableFilters.recruitStatuses.forEach((status) => {
      const labels: Record<string, string> = {
        recruiting: '모집중',
        always: '상시모집',
        upcoming: '모집예정',
      };
      newFilters.push({ id: `recruit-${status}`, label: '모집상태', value: labels[status] || status });
    });

    // 기존 카테고리 필터와 병합
    const categoryFilters = appliedFilters.filter(f => 
      !f.id.startsWith('region-') && 
      !f.id.startsWith('age-') && 
      !f.id.startsWith('employment-') && 
      !f.id.startsWith('recruit-')
    );
    setAppliedFilters([...categoryFilters, ...newFilters]);
    setCurrentPage(1);

    if (newFilters.length > 0) {
      toast.success('필터가 적용되었습니다');
    }

    scrollToTop();
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const now = Date.now();
  const recruitingCount = policies.filter(p => !p.isAlwaysOpen && p.endsAt && new Date(p.endsAt).getTime() >= now).length;
  const alwaysOpenCount = policies.filter(p => p.isAlwaysOpen).length;
  const periodRawCount = policies.filter(p => !p.isAlwaysOpen && !p.endsAt && !!p.periodRaw).length;
  const unknownCount = policies.filter(p => !p.isAlwaysOpen && !p.endsAt && !p.periodRaw).length;
  const filteredPolicies = policies
    .filter(p => {
      if (!statusFilter) return true;
      if (statusFilter === 'recruiting') return !p.isAlwaysOpen && !!p.endsAt && new Date(p.endsAt).getTime() >= now;
      if (statusFilter === 'always') return p.isAlwaysOpen;
      if (statusFilter === 'period_raw') return !p.isAlwaysOpen && !p.endsAt && !!p.periodRaw;
      if (statusFilter === 'unknown') return !p.isAlwaysOpen && !p.endsAt && !p.periodRaw;
      return true;
    })
    .filter(p => !typeFilter || (p as any).policyType === typeFilter);

  return (
    <MainLayout>
      <div className="bg-white/80 backdrop-blur-sm border-b border-[var(--border)] sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
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
                    <button type="button" onClick={() => setStatusFilter(p => p === 'recruiting' ? null : 'recruiting')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all ${statusFilter === 'recruiting' ? 'bg-emerald-200 border-emerald-400 text-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:opacity-80'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      모집중 {recruitingCount}
                    </button>
                  )}
                  {alwaysOpenCount > 0 && (
                    <button type="button" onClick={() => setStatusFilter(p => p === 'always' ? null : 'always')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all ${statusFilter === 'always' ? 'bg-blue-200 border-blue-400 text-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200 hover:opacity-80'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      상시 {alwaysOpenCount}
                    </button>
                  )}
                  {periodRawCount > 0 && (
                    <button type="button" onClick={() => setStatusFilter(p => p === 'period_raw' ? null : 'period_raw')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all ${statusFilter === 'period_raw' ? 'bg-amber-200 border-amber-400 text-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200 hover:opacity-80'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                      별도 확인 {periodRawCount}
                    </button>
                  )}
                  {unknownCount > 0 && (
                    <button type="button" onClick={() => setStatusFilter(p => p === 'unknown' ? null : 'unknown')} className={`flex items-center gap-1.5 px-2.5 py-1 font-semibold rounded-full border transition-all ${statusFilter === 'unknown' ? 'bg-red-200 border-red-400 text-red-800' : 'bg-red-50 text-red-700 border-red-200 hover:opacity-80'}`}>
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
              <SortDropdown value={sortBy} onChange={setSortBy} />
              <Button 
                variant={isExpandableFiltersOpen ? "primary" : "secondary"}
                className="gap-2"
                onClick={() => setIsExpandableFiltersOpen(!isExpandableFiltersOpen)}
                aria-label="필터 열기"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">필터</span>
              </Button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterChipGroup
              filters={quickFilters}
              selected={selectedFilters}
              onChange={handleFilterChange}
            />
            <button
              type="button"
              onClick={() => setTypeFilter(p => p === 'application' ? null : 'application')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${typeFilter === 'application' ? 'bg-violet-500 text-white border-violet-500' : 'bg-violet-50 text-violet-700 border-violet-200 hover:opacity-80'}`}
            >
              신청형
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter(p => p === 'info' ? null : 'info')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${typeFilter === 'info' ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50 text-orange-700 border-orange-200 hover:opacity-80'}`}
            >
              정보형
            </button>
          </div>

          {/* Expandable Filters - Toggleable */}
          <AnimatePresence>
            {isExpandableFiltersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <ExpandableFilters 
                  onChange={handleExpandableFiltersChange}
                  onApply={handleApplyExpandableFilters}
                  variant="tabs"
                />
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
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                >
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
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-[var(--muted-foreground)] px-2">
                    {currentPage} / {Math.ceil(filteredPolicies.length / PAGE_SIZE)}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage(Math.min(Math.ceil(filteredPolicies.length / PAGE_SIZE), currentPage + 1))}
                    disabled={currentPage === Math.ceil(filteredPolicies.length / PAGE_SIZE)}
                  >
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

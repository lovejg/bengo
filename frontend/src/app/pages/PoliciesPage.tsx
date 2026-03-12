import { useState, useEffect } from 'react';
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

const quickFilters = [
  { id: 'youth_policy', label: '청년정책' },
  { id: 'childcare_policy', label: '육아정책' },
];

export function PoliciesPage() {
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filters: string[]) => {
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
    
    if (newFilters.length > 0) {
      toast.success('필터가 적용되었습니다');
    }
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  return (
    <MainLayout>
      <div className="bg-white border-b border-[var(--border)] sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4 sm:py-6 space-y-4">
          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <SearchBar onSearch={handleSearch} defaultValue={searchQuery} />
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
          <FilterChipGroup
            filters={quickFilters}
            selected={selectedFilters}
            onChange={handleFilterChange}
          />

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
        {!isLoading && !hasError && (
          <div className="mb-6">
            <p className="text-[var(--muted-foreground)]">
              총 <span className="text-[var(--foreground)] font-semibold">{policies.length}개</span>의
              정책을 찾았습니다
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

          {!isLoading && !hasError && policies.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <EmptyState type="noResult" onAction={handleClearAll} actionLabel="필터 초기화" />
            </motion.div>
          )}

          {!isLoading && !hasError && policies.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PolicyList policies={policies} hasMore={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}

export default PoliciesPage;

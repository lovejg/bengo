import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
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
import { PolicyCardProps } from '../components/organisms/PolicyCard';

// Mock data
const mockPolicies: PolicyCardProps[] = [
  {
    id: '1',
    title: '청년 월세 지원 사업',
    summary: '만 19~34세 청년에게 월 최대 20만원, 최대 12개월간 월세를 지원합니다.',
    agency: '서울시 주택정책실',
    region: '서울 전역',
    period: '2026.01.01 ~ 2026.12.31',
    status: 'recruiting',
    eligibility: 'eligible',
    source: '서울청년몽땅',
    categories: ['housing'],
  },
  {
    id: '2',
    title: '청년 구직활동 지원금',
    summary: '구직 중인 청년에게 월 50만원씩 최대 6개월간 지원합니다.',
    agency: '고용노동부',
    region: '전국',
    period: '상시 모집',
    status: 'always',
    eligibility: 'needsReview',
    source: 'SSIS',
    categories: ['employment'],
  },
  {
    id: '3',
    title: '강남구 청년 일자리 지원 프로그램',
    summary: '강남구 거주 청년의 취업을 위한 교육 및 인턴십 프로그램',
    agency: '강남구청',
    region: '강남구',
    period: '2026.03.01 ~ 2026.03.31',
    status: 'recruiting',
    eligibility: 'eligible',
    source: '크롤링',
    categories: ['employment', 'education'],
  },
  {
    id: '4',
    title: '서울시 청년 창업 지원금',
    summary: '예비 창업자 및 초기 창업자를 대상으로 최대 1천만원 지원',
    agency: '서울시 경제정책실',
    region: '서울 전역',
    period: '2026.02.01 ~ 2026.02.28',
    status: 'closed',
    source: '온통청년',
    categories: ['employment'],
  },
  {
    id: '5',
    title: '마포구 청년 문화활동 지원',
    summary: '마포구 거주 청년에게 문화활동비 연 30만원 지원',
    agency: '마포구청',
    region: '마포구',
    period: '2026.01.01 ~ 2026.12.31',
    status: 'recruiting',
    eligibility: 'infoLacking',
    source: '크롤링',
    categories: ['culture'],
  },
  {
    id: '6',
    title: '청년 전월세 보증금 대출',
    summary: '무주택 청년의 전월세 보증금 대출 이자 지원',
    agency: '주택도시보증공사',
    region: '전국',
    period: '상시 모집',
    status: 'always',
    eligibility: 'needsReview',
    source: 'SSIS',
    categories: ['housing', 'welfare'],
  },
];

const quickFilters = [
  { id: 'housing', label: '주거' },
  { id: 'employment', label: '취업·창업' },
  { id: 'education', label: '교육' },
  { id: 'culture', label: '문화' },
  { id: 'welfare', label: '복지·생활' },
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
  const [policies, setPolicies] = useState<PolicyCardProps[]>([]);

  // Simulate initial data loading
  useEffect(() => {
    const loadPolicies = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setPolicies(mockPolicies);
      } catch (error) {
        setHasError(true);
        toast.error('정책 목록을 불러오는데 실패했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicies();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) return;
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      // In real app, filter by query
      toast.success(`"${query}"로 검색했습니다`);
    } finally {
      setIsLoading(false);
    }
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
    window.location.reload();
  };

  // 검색어와 카테고리 필터 적용
  const filteredPolicies = policies.filter((policy) => {
    // 검색어 필터
    const matchesSearch = searchQuery
      ? policy.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // 카테고리 필터
    const matchesCategory = selectedFilters.length > 0
      ? selectedFilters.some(filter => policy.categories?.includes(filter) ?? false)
      : true;
    
    return matchesSearch && matchesCategory;
  });

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
              총 <span className="text-[var(--foreground)] font-semibold">{filteredPolicies.length}개</span>의
              정책을 찾았습니다
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" role="status" aria-label="정책 목록 로딩 중">
            {[...Array(4)].map((_, i) => (
              <PolicyCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <EmptyState
            type="error"
            onAction={handleRetry}
            actionLabel="다시 시도"
          />
        )}

        {/* No Results */}
        {!isLoading && !hasError && filteredPolicies.length === 0 && (
          <EmptyState
            type="noResult"
            onAction={handleClearAll}
            actionLabel="필터 초기화"
          />
        )}

        {/* Policy List */}
        {!isLoading && !hasError && filteredPolicies.length > 0 && (
          <PolicyList
            policies={filteredPolicies}
            hasMore={false}
          />
        )}
      </div>
    </MainLayout>
  );
}

export default PoliciesPage;
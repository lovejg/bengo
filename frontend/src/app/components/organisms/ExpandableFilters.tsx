import { useState, useEffect } from 'react';
import { MapPin, Users, Briefcase, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpandableFilterButton } from '../molecules/ExpandableFilterButton';
import { FilterOptionGrid } from '../molecules/FilterOptionGrid';
import { Button } from '../atoms/Button';

// recruitStatuses 제거됨
export interface ExpandableFiltersState {
  categories: string[];
  regions: string[];
  ages: string[];
  employmentStatuses: string[];
}

interface ExpandableFiltersProps {
  onChange: (filters: ExpandableFiltersState) => void;
  onApply?: () => void;
  variant?: 'accordion' | 'tabs' | 'grid' | 'sidebar';
  defaultValue?: ExpandableFiltersState;
}

const EMPTY: ExpandableFiltersState = {
  categories: [],
  regions: [],
  ages: [],
  employmentStatuses: [],
};

const categoryOptions = [
  { id: 'youth_policy', label: '청년정책' },
  { id: 'childcare_policy', label: '육아정책' },
  { id: 'senior_policy', label: '노인정책' },
  { id: 'disability_policy', label: '장애인정책' },
];

const regionOptions = [
  { id: 'all', label: '전체' },
  { id: 'seoul', label: '서울' },
];

const ageOptions = [
  { id: '19-24', label: '19-24세' },
  { id: '25-29', label: '25-29세' },
  { id: '30-34', label: '30-34세' },
];

const employmentStatusOptions = [
  { id: 'student', label: '학생' },
  { id: 'jobseeker', label: '구직자' },
  { id: 'employed', label: '재직자' },
];

export function ExpandableFilters({
  onChange,
  onApply,
  variant = 'accordion',
  defaultValue,
}: ExpandableFiltersProps) {
  const [filters, setFilters] = useState<ExpandableFiltersState>(defaultValue ?? EMPTY);
  const [activeTab, setActiveTab] = useState<
    'categories' | 'regions' | 'ages' | 'employmentStatuses'
  >('categories');

  useEffect(() => {
    onChange(filters);
  }, [filters, onChange]);

  const handleCategoryChange = (selected: string[]) =>
    setFilters((prev) => ({ ...prev, categories: selected }));
  const handleRegionChange = (selected: string[]) =>
    setFilters((prev) => ({ ...prev, regions: selected }));
  const handleAgeChange = (selected: string[]) =>
    setFilters((prev) => ({ ...prev, ages: selected }));
  const handleEmploymentStatusChange = (selected: string[]) =>
    setFilters((prev) => ({ ...prev, employmentStatuses: selected }));
  const handleReset = () => setFilters(EMPTY);

  const totalSelected =
    filters.categories.length +
    filters.regions.filter((r) => r !== 'all').length +
    filters.ages.filter((a) => a !== 'all').length +
    filters.employmentStatuses.filter((s) => s !== 'all').length;

  // ── TABS LAYOUT ────────────────────────────────────────────────────────────
  if (variant === 'tabs') {
    const tabs = [
      {
        id: 'categories' as const,
        label: '카테고리',
        icon: <LayoutGrid className="h-[15px] w-[15px]" />,
        count: filters.categories.length,
      },
      {
        id: 'regions' as const,
        label: '지역',
        icon: <MapPin className="h-[15px] w-[15px]" />,
        count: filters.regions.filter((r) => r !== 'all').length,
      },
      {
        id: 'ages' as const,
        label: '나이대',
        icon: <Users className="h-[15px] w-[15px]" />,
        count: filters.ages.filter((a) => a !== 'all').length,
      },
      {
        id: 'employmentStatuses' as const,
        label: '상태',
        icon: <Briefcase className="h-[15px] w-[15px]" />,
        count: filters.employmentStatuses.filter((s) => s !== 'all').length,
      },
    ];

    return (
      <div className="overflow-hidden">

        {/* 탭 바: 언더라인 스타일 */}
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-1.5
                  px-4 py-3 text-[13px] font-semibold
                  transition-all duration-200 whitespace-nowrap select-none cursor-pointer
                  hover:scale-105
                  ${isActive
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--accent)]'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[var(--accent)] text-white text-[10px] font-bold leading-none">
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 탭 콘텐츠: 패딩만, 내부 카드/박스 없음 */}
        <div className="px-5 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              {activeTab === 'categories' && (
                <FilterOptionGrid
                  options={categoryOptions}
                  selected={filters.categories}
                  onChange={handleCategoryChange}
                  multiSelect
                  variant="figma"
                />
              )}
              {activeTab === 'regions' && (
                <FilterOptionGrid
                  options={regionOptions}
                  selected={filters.regions}
                  onChange={handleRegionChange}
                  multiSelect
                  variant="figma"
                />
              )}
              {activeTab === 'ages' && (
                <FilterOptionGrid
                  options={ageOptions}
                  selected={filters.ages}
                  onChange={handleAgeChange}
                  multiSelect
                  variant="figma"
                />
              )}
              {activeTab === 'employmentStatuses' && (
                <FilterOptionGrid
                  options={employmentStatusOptions}
                  selected={filters.employmentStatuses}
                  onChange={handleEmploymentStatusChange}
                  multiSelect
                  variant="figma"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 하단 액션 바: 선택 시에만 노출 */}
        <AnimatePresence>
          {totalSelected > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-[var(--border)] px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--accent)]">
                  {totalSelected}개 선택됨
                </span>
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                  >
                    초기화
                  </button>
                  {onApply && (
                    <Button
                      variant="primary"
                      className="rounded-full px-5 h-9 text-sm font-semibold"
                      onClick={onApply}
                    >
                      적용하기
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── ACCORDION LAYOUT ────────────────────────────────────────────────────────
  if (variant === 'accordion') {
    return (
      <div className="space-y-4">
        <div className="space-y-4 p-4 bg-[var(--muted)]/20 rounded-[12px] border border-[var(--border)]">
          <ExpandableFilterButton
            label="지역"
            icon={<MapPin className="h-4 w-4" />}
            selectedCount={filters.regions.filter((r) => r !== 'all').length}
            variant="glass"
          >
            <FilterOptionGrid options={regionOptions} selected={filters.regions} onChange={handleRegionChange} multiSelect variant="glass" />
          </ExpandableFilterButton>
          <ExpandableFilterButton
            label="나이대"
            icon={<Users className="h-4 w-4" />}
            selectedCount={filters.ages.filter((a) => a !== 'all').length}
            variant="glass"
          >
            <FilterOptionGrid options={ageOptions} selected={filters.ages} onChange={handleAgeChange} multiSelect variant="glass" />
          </ExpandableFilterButton>
          <ExpandableFilterButton
            label="상태"
            icon={<Briefcase className="h-4 w-4" />}
            selectedCount={filters.employmentStatuses.filter((s) => s !== 'all').length}
            variant="glass"
          >
            <FilterOptionGrid options={employmentStatusOptions} selected={filters.employmentStatuses} onChange={handleEmploymentStatusChange} multiSelect variant="glass" />
          </ExpandableFilterButton>
        </div>
        <AnimatePresence>
          {totalSelected > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2 pt-2"
            >
              <Button variant="ghost" onClick={handleReset} className="flex-1">초기화</Button>
              {onApply && (
                <Button variant="primary" onClick={onApply} className="flex-1">
                  적용하기 ({totalSelected})
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── SIDEBAR LAYOUT ──────────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    const sidebarCategories = [
      { id: 'regions' as const, label: '지역', icon: <MapPin className="h-5 w-5" />, count: filters.regions.filter((r) => r !== 'all').length },
      { id: 'ages' as const, label: '나이대', icon: <Users className="h-5 w-5" />, count: filters.ages.filter((a) => a !== 'all').length },
      { id: 'employmentStatuses' as const, label: '상태', icon: <Briefcase className="h-5 w-5" />, count: filters.employmentStatuses.filter((s) => s !== 'all').length },
    ];
    return (
      <div className="space-y-4">
        <div className="flex gap-4 bg-white rounded-[12px] border border-[var(--border)]/50 shadow-sm overflow-hidden">
          <div className="w-40 bg-[var(--muted)]/10 border-r border-[var(--border)]/50 py-3">
            {sidebarCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 transition-all duration-200 relative cursor-pointer ${activeTab === category.id ? 'text-[var(--accent)] font-semibold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                {activeTab === category.id && (
                  <motion.div layoutId="sidebar-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                )}
                <span className={activeTab === category.id ? 'text-[var(--accent)]' : ''}>{category.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm">{category.label}</div>
                  {category.count > 0 && <div className="text-xs text-[var(--accent)] font-semibold mt-0.5">{category.count}개 선택</div>}
                </div>
              </button>
            ))}
          </div>
          <div className="flex-1 p-5">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                {activeTab === 'regions' && <FilterOptionGrid options={regionOptions} selected={filters.regions} onChange={handleRegionChange} multiSelect variant="neo" />}
                {activeTab === 'ages' && <FilterOptionGrid options={ageOptions} selected={filters.ages} onChange={handleAgeChange} multiSelect variant="neo" />}
                {activeTab === 'employmentStatuses' && <FilterOptionGrid options={employmentStatusOptions} selected={filters.employmentStatuses} onChange={handleEmploymentStatusChange} multiSelect variant="neo" />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence>
          {totalSelected > 0 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="flex gap-2">
              <Button variant="ghost" onClick={handleReset} className="flex-1">초기화</Button>
              {onApply && <Button variant="primary" onClick={onApply} className="flex-1">적용하기 ({totalSelected})</Button>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}

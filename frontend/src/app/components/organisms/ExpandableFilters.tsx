import { useState, useEffect } from 'react';
import { MapPin, Users, Briefcase, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExpandableFilterButton } from '../molecules/ExpandableFilterButton';
import { FilterOptionGrid } from '../molecules/FilterOptionGrid';
import { Button } from '../atoms/Button';

export interface ExpandableFiltersState {
  regions: string[];
  ages: string[];
  employmentStatuses: string[];
  recruitStatuses: string[];
}

interface ExpandableFiltersProps {
  onChange: (filters: ExpandableFiltersState) => void;
  onApply?: () => void;
  variant?: 'accordion' | 'tabs' | 'grid' | 'sidebar';
}

const regionOptions = [
  { id: 'all', label: '전체' },
  { id: 'seoul', label: '서울 전체' },
  { id: 'seoul_gangnam', label: '서울 강남구' },
  { id: 'seoul_mapo', label: '서울 마포구' },
  { id: 'seoul_songpa', label: '서울 송파구' },
];

const ageOptions = [
  { id: 'all', label: '전체' },
  { id: '19-24', label: '19-24세' },
  { id: '25-29', label: '25-29세' },
  { id: '30-34', label: '30-34세' },
];

const employmentStatusOptions = [
  { id: 'all', label: '전체' },
  { id: 'student', label: '학생' },
  { id: 'jobseeker', label: '구직자' },
  { id: 'employed', label: '재직자' },
];

const recruitStatusOptions = [
  { id: 'all', label: '전체' },
  { id: 'recruiting', label: '모집중' },
  { id: 'always', label: '상시' },
];

export function ExpandableFilters({ onChange, onApply, variant = 'accordion' }: ExpandableFiltersProps) {
  const [filters, setFilters] = useState<ExpandableFiltersState>({
    regions: [],
    ages: [],
    employmentStatuses: [],
    recruitStatuses: [],
  });

  // For tabs variant
  const [activeTab, setActiveTab] = useState<'regions' | 'ages' | 'employmentStatuses' | 'recruitStatuses'>('regions');

  useEffect(() => {
    onChange(filters);
  }, [filters, onChange]);

  const handleRegionChange = (selected: string[]) => {
    setFilters((prev) => ({ ...prev, regions: selected }));
  };

  const handleAgeChange = (selected: string[]) => {
    setFilters((prev) => ({ ...prev, ages: selected }));
  };

  const handleEmploymentStatusChange = (selected: string[]) => {
    setFilters((prev) => ({ ...prev, employmentStatuses: selected }));
  };

  const handleRecruitStatusChange = (selected: string[]) => {
    setFilters((prev) => ({ ...prev, recruitStatuses: selected }));
  };

  const handleReset = () => {
    setFilters({
      regions: [],
      ages: [],
      employmentStatuses: [],
      recruitStatuses: [],
    });
  };

  const totalSelected =
    filters.regions.length +
    filters.ages.length +
    filters.employmentStatuses.length +
    filters.recruitStatuses.length;

  // ACCORDION LAYOUT - 세로 아코디언
  if (variant === 'accordion') {
    return (
      <div className="space-y-3">
        {/* Filter Buttons */}
        <div className="space-y-3 p-4 bg-[var(--muted)]/20 rounded-[12px] border border-[var(--border)]">
          <ExpandableFilterButton
            label="지역"
            icon={<MapPin className="h-4 w-4" />}
            selectedCount={filters.regions.length}
            variant="glass"
          >
            <FilterOptionGrid
              options={regionOptions}
              selected={filters.regions}
              onChange={handleRegionChange}
              multiSelect
              variant="glass"
            />
          </ExpandableFilterButton>

          <ExpandableFilterButton
            label="나이대"
            icon={<Users className="h-4 w-4" />}
            selectedCount={filters.ages.length}
            variant="glass"
          >
            <FilterOptionGrid
              options={ageOptions}
              selected={filters.ages}
              onChange={handleAgeChange}
              multiSelect
              variant="glass"
            />
          </ExpandableFilterButton>

          <ExpandableFilterButton
            label="상태"
            icon={<Briefcase className="h-4 w-4" />}
            selectedCount={filters.employmentStatuses.length}
            variant="glass"
          >
            <FilterOptionGrid
              options={employmentStatusOptions}
              selected={filters.employmentStatuses}
              onChange={handleEmploymentStatusChange}
              multiSelect
              variant="glass"
            />
          </ExpandableFilterButton>

          <ExpandableFilterButton
            label="모집 상태"
            icon={<AlertCircle className="h-4 w-4" />}
            selectedCount={filters.recruitStatuses.length}
            variant="glass"
          >
            <FilterOptionGrid
              options={recruitStatusOptions}
              selected={filters.recruitStatuses}
              onChange={handleRecruitStatusChange}
              multiSelect
              variant="glass"
            />
          </ExpandableFilterButton>
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {totalSelected > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2 pt-2"
            >
              <Button
                variant="ghost"
                onClick={handleReset}
                className="flex-1"
              >
                초기화
              </Button>
              {onApply && (
                <Button
                  variant="primary"
                  onClick={onApply}
                  className="flex-1"
                >
                  적용하기 ({totalSelected})
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // TABS LAYOUT - 가로 탭
  if (variant === 'tabs') {
    const tabs = [
      { id: 'regions' as const, label: '지역', icon: <MapPin className="h-4 w-4" />, count: filters.regions.length },
      { id: 'ages' as const, label: '나이대', icon: <Users className="h-4 w-4" />, count: filters.ages.length },
      { id: 'employmentStatuses' as const, label: '상태', icon: <Briefcase className="h-4 w-4" />, count: filters.employmentStatuses.length },
      { id: 'recruitStatuses' as const, label: '모집상태', icon: <AlertCircle className="h-4 w-4" />, count: filters.recruitStatuses.length },
    ];

    return (
      <div className="space-y-4">
        {/* Horizontal Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--muted)]/20 rounded-[12px] border border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 relative px-4 py-3 rounded-[10px] text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[var(--muted)]/80 text-[var(--foreground)] text-xs font-semibold">
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-5 bg-white rounded-[12px] border border-[var(--border)] shadow-sm">
              {activeTab === 'regions' && (
                <FilterOptionGrid
                  options={regionOptions}
                  selected={filters.regions}
                  onChange={handleRegionChange}
                  multiSelect
                  variant="tag"
                />
              )}
              {activeTab === 'ages' && (
                <FilterOptionGrid
                  options={ageOptions}
                  selected={filters.ages}
                  onChange={handleAgeChange}
                  multiSelect
                  variant="tag"
                />
              )}
              {activeTab === 'employmentStatuses' && (
                <FilterOptionGrid
                  options={employmentStatusOptions}
                  selected={filters.employmentStatuses}
                  onChange={handleEmploymentStatusChange}
                  multiSelect
                  variant="tag"
                />
              )}
              {activeTab === 'recruitStatuses' && (
                <FilterOptionGrid
                  options={recruitStatusOptions}
                  selected={filters.recruitStatuses}
                  onChange={handleRecruitStatusChange}
                  multiSelect
                  variant="tag"
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Action Buttons */}
        <AnimatePresence>
          {totalSelected > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2"
            >
              <Button
                variant="ghost"
                onClick={handleReset}
                className="flex-1"
              >
                초기화
              </Button>
              {onApply && (
                <Button
                  variant="primary"
                  onClick={onApply}
                  className="flex-1"
                >
                  적용하기 ({totalSelected})
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // SIDEBAR LAYOUT - 좌우 분할 (왼쪽: 카테고리, 오른쪽: 옵션)
  if (variant === 'sidebar') {
    const categories = [
      { id: 'regions' as const, label: '지역', icon: <MapPin className="h-5 w-5" />, count: filters.regions.length },
      { id: 'ages' as const, label: '나이대', icon: <Users className="h-5 w-5" />, count: filters.ages.length },
      { id: 'employmentStatuses' as const, label: '상태', icon: <Briefcase className="h-5 w-5" />, count: filters.employmentStatuses.length },
      { id: 'recruitStatuses' as const, label: '모집상태', icon: <AlertCircle className="h-5 w-5" />, count: filters.recruitStatuses.length },
    ];

    return (
      <div className="space-y-3">
        <div className="flex gap-4 bg-white rounded-[12px] border border-[var(--border)]/50 shadow-sm overflow-hidden">
          {/* Left Sidebar - Categories */}
          <div className="w-40 bg-[var(--muted)]/10 border-r border-[var(--border)]/50 py-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(category.id)}
                className={`w-full px-4 py-3.5 flex items-center gap-3 transition-all duration-200 relative ${
                  activeTab === category.id
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/20'
                }`}
              >
                {activeTab === category.id && (
                  <motion.div
                    layoutId="activeCategoryIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className={activeTab === category.id ? 'text-[var(--accent)]' : ''}>
                  {category.icon}
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm">{category.label}</div>
                  {category.count > 0 && (
                    <div className="text-xs text-[var(--accent)] font-semibold mt-0.5">
                      {category.count}개 선택
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Right Content - Options */}
          <div className="flex-1 p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'regions' && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[var(--accent)]" />
                      지역을 선택하세요
                    </h3>
                    <FilterOptionGrid
                      options={regionOptions}
                      selected={filters.regions}
                      onChange={handleRegionChange}
                      multiSelect
                      variant="neo"
                    />
                  </div>
                )}
                {activeTab === 'ages' && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-[var(--accent)]" />
                      나이대를 선택하세요
                    </h3>
                    <FilterOptionGrid
                      options={ageOptions}
                      selected={filters.ages}
                      onChange={handleAgeChange}
                      multiSelect
                      variant="neo"
                    />
                  </div>
                )}
                {activeTab === 'employmentStatuses' && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-[var(--accent)]" />
                      상태를 선택하세요
                    </h3>
                    <FilterOptionGrid
                      options={employmentStatusOptions}
                      selected={filters.employmentStatuses}
                      onChange={handleEmploymentStatusChange}
                      multiSelect
                      variant="neo"
                    />
                  </div>
                )}
                {activeTab === 'recruitStatuses' && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-[var(--accent)]" />
                      모집 상태를 선택하세요
                    </h3>
                    <FilterOptionGrid
                      options={recruitStatusOptions}
                      selected={filters.recruitStatuses}
                      onChange={handleRecruitStatusChange}
                      multiSelect
                      variant="neo"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {totalSelected > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex gap-2"
            >
              <Button
                variant="ghost"
                onClick={handleReset}
                className="flex-1"
              >
                초기화
              </Button>
              {onApply && (
                <Button
                  variant="primary"
                  onClick={onApply}
                  className="flex-1"
                >
                  적용하기 ({totalSelected})
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
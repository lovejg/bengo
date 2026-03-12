import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Divider } from '../atoms/Divider';

export interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
}

const regions = [
  { id: 'all', label: '전체' },
  { id: 'gangnam', label: '강남구' },
  { id: 'mapo', label: '마포구' },
  { id: 'songpa', label: '송파구' },
];

const ageRanges = [
  { id: 'all', label: '전체' },
  { id: '19-24', label: '19-24세' },
  { id: '25-29', label: '25-29세' },
  { id: '30-34', label: '30-34세' },
];

const statuses = [
  { id: 'all', label: '전체' },
  { id: 'student', label: '학생' },
  { id: 'jobseeker', label: '구직자' },
  { id: 'employed', label: '재직자' },
];

const recruitStatuses = [
  { id: 'all', label: '전체' },
  { id: 'recruiting', label: '모집중' },
  { id: 'always', label: '상시' },
];

export function FilterDrawer({ isOpen, onClose, onApply }: FilterDrawerProps) {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedAge, setSelectedAge] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRecruitStatus, setSelectedRecruitStatus] = useState('all');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setIsAnimating(false), 200);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleReset = () => {
    setSelectedRegion('all');
    setSelectedAge('all');
    setSelectedStatus('all');
    setSelectedRecruitStatus('all');
  };

  const handleApply = () => {
    onApply({
      region: selectedRegion,
      age: selectedAge,
      status: selectedStatus,
      recruitStatus: selectedRecruitStatus,
    });
    onClose();
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 w-full max-w-lg bg-white z-50 shadow-2xl overflow-y-auto transition-all duration-300 ease-out max-h-[80vh] rounded-2xl mx-4 ${
          isOpen ? '-translate-y-1/2 opacity-100 scale-100' : '-translate-y-[45%] opacity-0 scale-95'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--border)] p-6 flex items-center justify-between z-10 rounded-t-2xl">
          <h3 id="filter-drawer-title">전체 필터</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--muted)] rounded-lg transition-colors duration-150"
            aria-label="필터 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Region */}
          <div>
            <h4 className="mb-3">지역</h4>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="지역 선택">
              {regions.map((region) => (
                <Chip
                  key={region.id}
                  selected={selectedRegion === region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  aria-pressed={selectedRegion === region.id}
                >
                  {region.label}
                </Chip>
              ))}
            </div>
          </div>

          <Divider />

          {/* Age */}
          <div>
            <h4 className="mb-3">나이대</h4>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="나이대 선택">
              {ageRanges.map((age) => (
                <Chip
                  key={age.id}
                  selected={selectedAge === age.id}
                  onClick={() => setSelectedAge(age.id)}
                  aria-pressed={selectedAge === age.id}
                >
                  {age.label}
                </Chip>
              ))}
            </div>
          </div>

          <Divider />

          {/* Status */}
          <div>
            <h4 className="mb-3">상태</h4>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="상태 선택">
              {statuses.map((status) => (
                <Chip
                  key={status.id}
                  selected={selectedStatus === status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  aria-pressed={selectedStatus === status.id}
                >
                  {status.label}
                </Chip>
              ))}
            </div>
          </div>

          <Divider />

          {/* Recruit Status */}
          <div>
            <h4 className="mb-3">모집 상태</h4>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="모집 상태 선택">
              {recruitStatuses.map((status) => (
                <Chip
                  key={status.id}
                  selected={selectedRecruitStatus === status.id}
                  onClick={() => setSelectedRecruitStatus(status.id)}
                  aria-pressed={selectedRecruitStatus === status.id}
                >
                  {status.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[var(--border)] p-6 flex gap-3">
          <Button variant="secondary" onClick={handleReset} className="flex-1">
            초기화
          </Button>
          <Button onClick={handleApply} className="flex-1">
            적용하기
          </Button>
        </div>
      </div>
    </>
  );
}
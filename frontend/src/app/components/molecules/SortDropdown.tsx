import { cn } from '../../lib/utils';
import { CustomSelect } from '../atoms/CustomSelect';

export type SortOption = 'latest' | 'deadline' | 'recommended';

export interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'deadline', label: '마감임박순' },
  { value: 'recommended', label: '추천순' },
];

export function SortDropdown({ value, onChange, className }: SortDropdownProps) {
  return (
    <div className={cn('w-36', className)}>
      <CustomSelect
        value={value}
        onChange={(v) => onChange(v as SortOption)}
        options={sortOptions}
      />
    </div>
  );
}

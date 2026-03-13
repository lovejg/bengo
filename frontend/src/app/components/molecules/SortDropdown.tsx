import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type SortOption = 'latest' | 'deadline' | 'recommended';

export interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const sortLabels: Record<SortOption, string> = {
  latest: '최신순',
  deadline: '마감임박순',
  recommended: '추천순',
};

export function SortDropdown({ value, onChange, className }: SortDropdownProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="appearance-none rounded-xl border border-[var(--border)] bg-white px-4 py-2 pr-10 text-sm cursor-pointer hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        <option value="latest">{sortLabels.latest}</option>
        <option value="deadline">{sortLabels.deadline}</option>
        <option value="recommended">{sortLabels.recommended}</option>
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none" />
    </div>
  );
}

import { X } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface AppliedFiltersRowProps {
  filters: Array<{ id: string; label: string; value: string }>;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function AppliedFiltersRow({ filters, onRemove, onClearAll }: AppliedFiltersRowProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-[var(--muted-foreground)]">적용된 필터:</span>
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onRemove(filter.id)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1 text-sm hover:opacity-90 transition-opacity"
        >
          {filter.value}
          <X className="h-3 w-3" />
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll}>
        전체 초기화
      </Button>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ value, onChange, options, placeholder = '선택하세요', className }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium bg-white transition-all duration-200',
          open
            ? 'border-[var(--accent)] text-[var(--foreground)] shadow-sm ring-2 ring-[var(--accent)]/20'
            : 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--accent)]',
          !selectedLabel && 'text-[var(--muted-foreground)]',
        )}
      >
        <span>{selectedLabel ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 text-[var(--muted-foreground)] transition-transform duration-200 flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                value === opt.value
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-[var(--foreground)] hover:bg-[var(--muted)]',
              )}
            >
              {opt.label}
              {value === opt.value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

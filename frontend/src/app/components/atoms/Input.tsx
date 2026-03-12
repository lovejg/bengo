import { forwardRef, InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  helperText?: string;
  onClear?: () => void;
  icon?: 'search' | 'none';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, onClear, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {icon === 'search' && (
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm transition-all duration-200',
              'placeholder:text-[var(--muted-foreground)]',
              'hover:border-[var(--accent)]/40',
              'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--muted)]',
              {
                'border-[var(--destructive)] focus:ring-[var(--destructive)]/30 focus:border-[var(--destructive)]': error,
                'pl-10': icon === 'search',
                'pr-10': onClear && props.value,
              },
              className
            )}
            {...props}
          />
          {onClear && props.value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-md p-1 hover:bg-[var(--muted)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-[var(--destructive)] leading-relaxed">{error}</p>}
        {helperText && !error && (
          <p className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
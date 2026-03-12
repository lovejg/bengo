import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  variant?: 'filter' | 'tag';
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected, variant = 'filter', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm transition-all duration-150',
          'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          'active:scale-95',
          {
            // Filter chips (selectable)
            'border-[var(--border)] hover:border-[var(--accent)] hover:bg-blue-50 cursor-pointer':
              variant === 'filter' && !selected,
            'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm':
              variant === 'filter' && selected,
            // Tag chips (non-interactive)
            'border-[var(--border)] bg-[var(--muted)] cursor-default': variant === 'tag',
          },
          className
        )}
        aria-pressed={variant === 'filter' ? selected : undefined}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Chip.displayName = 'Chip';
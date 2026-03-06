import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'recruiting' | 'always' | 'closed' | 'needsReview' | 'eligible' | 'notEligible' | 'ineligible' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200',
        {
          'bg-emerald-500 text-white shadow-sm': variant === 'recruiting',
          'bg-blue-500 text-white shadow-sm': variant === 'always',
          'bg-[var(--muted)] text-[var(--muted-foreground)]': variant === 'closed',
          'bg-amber-100 text-amber-700 border border-amber-200': variant === 'needsReview',
          'bg-emerald-100 text-emerald-700 border border-emerald-200': variant === 'eligible',
          'bg-red-100 text-red-700 border border-red-200': variant === 'notEligible' || variant === 'ineligible',
          'bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)]': variant === 'default',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
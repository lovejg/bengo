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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-all duration-200',
        {
          'bg-emerald-500 text-white shadow-sm dark:bg-[rgba(52,211,153,0.16)] dark:text-[#6EE7B7] dark:shadow-none': variant === 'recruiting',
          'bg-blue-500 text-white shadow-sm dark:bg-[rgba(96,165,250,0.16)] dark:text-[#93C5FD] dark:shadow-none': variant === 'always',
          'bg-[var(--muted)] text-[var(--muted-foreground)]': variant === 'closed',
          'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-[rgba(251,191,36,0.14)] dark:text-[#FCD34D] dark:border-[rgba(251,191,36,0.24)]': variant === 'needsReview',
          'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-[rgba(52,211,153,0.14)] dark:text-[#6EE7B7] dark:border-[rgba(52,211,153,0.24)]': variant === 'eligible',
          'bg-red-100 text-red-700 border border-red-200 dark:bg-[rgba(248,113,113,0.14)] dark:text-[#FCA5A5] dark:border-[rgba(248,113,113,0.24)]': variant === 'notEligible' || variant === 'ineligible',
          'bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)]': variant === 'default',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

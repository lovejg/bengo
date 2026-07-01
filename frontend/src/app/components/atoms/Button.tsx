import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'cursor-pointer active:scale-[0.97]',
          {
            'bg-[var(--accent)] text-[var(--accent-foreground)] hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 focus-visible:ring-[var(--accent)]/50 dark:bg-gradient-to-r dark:from-[#3B82F6] dark:to-[#2563EB] dark:hover:shadow-[0_10px_28px_rgba(59,130,246,0.28)]':
              variant === 'primary',
            'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--muted)] border border-[var(--border)] focus-visible:ring-[var(--accent)]/30 dark:bg-[rgba(30,41,59,0.58)] dark:border-[var(--border-default)] dark:hover:bg-[rgba(30,41,59,0.86)] dark:hover:border-[var(--border-strong)]':
              variant === 'secondary',
            'border border-[var(--border)] bg-transparent hover:bg-[var(--muted)] focus-visible:ring-[var(--accent)]/30 dark:border-[var(--border-default)] dark:hover:bg-[rgba(30,41,59,0.5)]':
              variant === 'outline',
            'hover:bg-[var(--muted)] focus-visible:ring-[var(--accent)]/30 dark:hover:bg-[rgba(30,41,59,0.5)]': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5 focus-visible:ring-red-500/50 dark:bg-[#EF4444] dark:hover:bg-[#F87171]':
              variant === 'danger',
          },
          {
            'px-3.5 py-2 text-sm h-9': size === 'sm',
            'px-5 py-2.5 text-sm h-10': size === 'md',
            'px-7 py-3.5 text-base h-12': size === 'lg',
            'w-9 h-9 p-0': size === 'icon',
          },
          className
        )}
        aria-busy={loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

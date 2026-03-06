import { cn } from '../../lib/utils';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ orientation = 'horizontal', className }: DividerProps) {
  return (
    <div
      className={cn(
        'bg-[var(--border)]',
        {
          'h-px w-full': orientation === 'horizontal',
          'w-px h-full': orientation === 'vertical',
        },
        className
      )}
    />
  );
}

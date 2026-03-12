import { AlertCircle, FileText, Search } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface EmptyStateProps {
  type: 'empty' | 'noResult' | 'error';
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const config = {
    empty: {
      icon: FileText,
      title: '아직 정책이 없습니다',
      description: '새로운 정책이 추가되면 여기에 표시됩니다.',
    },
    noResult: {
      icon: Search,
      title: '검색 결과가 없습니다',
      description: '다른 검색어나 필터를 사용해보세요.',
    },
    error: {
      icon: AlertCircle,
      title: '오류가 발생했습니다',
      description: '잠시 후 다시 시도해주세요.',
    },
  };

  const { icon: Icon, title, description } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon className="h-12 w-12 text-[var(--muted-foreground)] mb-4" />
      <h3 className="mb-2">{title}</h3>
      <p className="text-[var(--muted-foreground)] mb-6 max-w-md">{description}</p>
      {onAction && actionLabel && (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

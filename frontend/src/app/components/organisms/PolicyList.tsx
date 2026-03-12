import { PolicyCard, PolicyCardProps } from './PolicyCard';
import { Skeleton } from '../atoms/Skeleton';
import { EmptyState } from '../molecules/EmptyState';

export interface PolicyListProps {
  policies: PolicyCardProps[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function PolicyList({ policies, loading, error, onRetry, onLoadMore, hasMore }: PolicyListProps) {
  if (loading && policies.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState type="error" onAction={onRetry} actionLabel="다시 시도" />;
  }

  if (policies.length === 0) {
    return <EmptyState type="noResult" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {policies.map((policy) => (
          <PolicyCard key={policy.id} {...policy} />
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      )}

      {hasMore && !loading && onLoadMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={onLoadMore}
            className="px-8 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
          >
            더보기
          </button>
        </div>
      )}
    </div>
  );
}

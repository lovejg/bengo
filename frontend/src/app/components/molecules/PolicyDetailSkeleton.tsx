import { Skeleton } from '../atoms/Skeleton';

export function PolicyDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Section Nav */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-2 flex flex-wrap gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>

      {/* Summary Section */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-6">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Target Section */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>

      {/* Criteria Section */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-5 w-48" />
      </div>
    </div>
  );
}

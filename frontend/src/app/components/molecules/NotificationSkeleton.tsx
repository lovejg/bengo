export function NotificationSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-7 h-7 bg-[var(--muted)] rounded-lg animate-pulse flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-full"></div>
            <div className="h-7 bg-[var(--muted)] rounded animate-pulse w-24"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

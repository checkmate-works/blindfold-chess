export function FeedSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-4 p-4 animate-pulse">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-28 mt-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GameSelectorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Game List Skeleton */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        {/* Header Skeleton */}
        <div className="px-4 sm:px-6 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="w-5 h-5 rounded border-2 border-muted-foreground/20 bg-muted/50"></div>
          <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
        </div>

        {/* List Items Skeleton */}
        <ul className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 sm:px-6 py-4 flex items-center gap-4">
              {/* Checkbox */}
              <div className="w-5 h-5 rounded border-2 border-muted-foreground/20 bg-muted/50 flex-shrink-0"></div>

              <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status Icon */}
                  <div className="w-8 h-8 rounded-md bg-muted animate-pulse flex-shrink-0"></div>

                  {/* Game Details */}
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 w-16 bg-muted rounded animate-pulse hidden sm:block"></div>
                    </div>
                    <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
                  </div>
                </div>

                {/* Date */}
                <div className="h-3 w-20 bg-muted rounded animate-pulse hidden sm:block"></div>
              </div>
            </div>
          ))}
        </ul>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="bg-muted/30 rounded-lg p-4 animate-pulse">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 h-11 bg-muted rounded"></div>
          <div className="sm:w-32 h-11 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  rows?: number;
};

export function GameListSkeleton({ rows = 5 }: Props = {}) {
  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <div className="animate-pulse">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-4 sm:px-6 py-3 border-b border-border last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Status Icon */}
                <div className="w-7 h-7 bg-muted rounded-md"></div>

                {/* Game Info */}
                <div className="flex items-center gap-4 text-sm">
                  {/* Color Icon */}
                  <div className="w-4 h-4 bg-muted rounded-full"></div>

                  {/* Separator */}
                  <div className="w-1 h-1 bg-muted rounded-full"></div>

                  {/* Moves */}
                  <div className="h-4 bg-muted rounded w-16"></div>

                  {/* Separator */}
                  <div className="w-1 h-1 bg-muted rounded-full"></div>

                  {/* Level */}
                  <div className="h-4 bg-muted rounded w-14"></div>
                </div>
              </div>

              {/* Delete button */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

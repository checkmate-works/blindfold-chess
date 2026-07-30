type Props = {
  /** How many placeholder cards to reserve. */
  count?: number;
};

/**
 * Placeholder reply cards for a post-detail `loading.tsx`: avatar, name/date
 * lines, two body lines and a like button, per card.
 *
 * Shared by the opening and square post-detail loading states, whose surrounding
 * skeletons still differ (an opening shows a move-list board and a rating block;
 * a square shows a plain highlight board) — only this run of cards was identical
 * in both.
 */
export function ReplyCardsSkeleton({ count = 2 }: Props) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-card border border-border rounded-lg space-y-3 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-3 w-40 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-6 w-16 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

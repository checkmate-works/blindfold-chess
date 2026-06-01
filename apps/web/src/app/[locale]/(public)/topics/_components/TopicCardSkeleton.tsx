/**
 * Loading placeholder for a stand-alone (card-variant) ActivityCard row.
 *
 * Renders `count` rows inside a `space-y-3` stack (matching the live lists).
 * `thumbnail` toggles the left board image: the topics feed, chunk catalog,
 * and opening posts show one; square posts (BaseTopicPostCard) do not.
 */
export function TopicCardSkeleton({
  count = 5,
  thumbnail = true,
}: {
  count?: number;
  thumbnail?: boolean;
}) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse gap-4 rounded-md border border-border bg-card p-4"
        >
          {thumbnail && (
            <div className="h-20 w-20 flex-shrink-0 rounded bg-muted sm:h-24 sm:w-24" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-4/5 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

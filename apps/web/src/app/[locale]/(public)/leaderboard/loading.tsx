/**
 * Leaderboard loading skeleton.
 *
 * Shown while the server fetches leaderboard rows. Mirrors the PageTitle +
 * tabular list layout to reduce layout shift.
 */
export default function LeaderboardLoading() {
  return (
    <>
      {/* PageTitle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="h-8 bg-muted rounded w-56 animate-pulse" />
      </div>

      {/* Filter row placeholder */}
      <div className="mb-4 flex items-center gap-2 animate-pulse">
        <div className="h-9 w-24 rounded-md bg-muted" />
        <div className="h-9 w-24 rounded-md bg-muted" />
        <div className="h-9 w-24 rounded-md bg-muted" />
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 p-4 border-b border-border last:border-b-0 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </>
  );
}

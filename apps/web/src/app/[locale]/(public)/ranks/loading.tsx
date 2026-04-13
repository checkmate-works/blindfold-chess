/**
 * Ranks page loading skeleton.
 *
 * Shown while the server fetches rank definitions and the current user's
 * achievements. Mirrors the grid of rank cards to minimise CLS.
 */
export default function RanksLoading() {
  return (
    <>
      {/* PageTitle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-5 shadow-sm animate-pulse"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
            <div className="h-4 bg-muted rounded w-full mb-2" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        ))}
      </div>
    </>
  );
}

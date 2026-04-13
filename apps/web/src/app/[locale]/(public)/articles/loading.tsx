/**
 * Articles listing loading skeleton.
 *
 * Shown while the server renders the paginated article list. Mirrors the
 * PageTitle + list layout to minimise CLS when the real content swaps in.
 */
export default function ArticlesLoading() {
  return (
    <>
      {/* PageTitle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 shadow-sm animate-pulse"
          >
            <div className="h-5 bg-muted rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        ))}
      </div>
    </>
  );
}

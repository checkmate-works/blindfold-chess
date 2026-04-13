/**
 * Topics index loading skeleton.
 *
 * Covers the topics landing page and its children (openings, squares, ...)
 * via Next.js segment boundaries. Keeps a lightweight card-grid frame.
 */
export default function TopicsLoading() {
  return (
    <>
      {/* PageTitle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-5 shadow-sm animate-pulse"
          >
            <div className="h-5 bg-muted rounded w-2/3 mb-3" />
            <div className="h-4 bg-muted rounded w-full mb-2" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        ))}
      </div>
    </>
  );
}

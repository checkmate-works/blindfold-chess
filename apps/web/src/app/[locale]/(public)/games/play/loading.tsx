/**
 * Games / play setup loading skeleton.
 *
 * Shown while the play setup page resolves (server-side dynamic data fetch,
 * auth checks, etc.). Mirrors the form-card frame shown on the real page.
 */
export default function GamesPlayLoading() {
  return (
    <>
      {/* PageTitle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-6 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded w-full" />
          <div className="h-10 bg-muted rounded w-full" />
          <div className="h-10 bg-muted rounded w-2/3" />
        </div>
        <div className="mt-6 flex justify-end">
          <div className="h-10 w-32 bg-muted rounded-md" />
        </div>
      </div>
    </>
  );
}

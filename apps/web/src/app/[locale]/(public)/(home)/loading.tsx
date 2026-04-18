import { FeedSkeleton } from './_components/FeedSkeleton';

/**
 * Home page loading skeleton.
 *
 * Next.js wraps the page in an implicit `<Suspense>` with this component as
 * the fallback. Because `page.tsx` uses `force-dynamic`, the skeleton is shown
 * during server-side data fetching on every navigation (and briefly on full
 * page reloads).
 *
 * This does NOT affect SEO — Googlebot waits for the final HTML, not the
 * Suspense fallback.
 *
 * The skeleton should mirror the layout of the real page (PageTitle + VsAiCard
 * + Feed) to minimise CLS when the actual content replaces it.
 */
export default function HomeLoading() {
  return (
    <>
      {/* PageTitle */}
      <div className="mb-8 flex items-center justify-center gap-2">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* VsAiCard skeleton — matches the loading state in VsAiCard.tsx */}
          <div className="p-4 sm:p-6 border-b border-border">
            <div className="animate-pulse">
              {/* Top row: icon + title on left, link placeholder on right */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-muted" />
                  <div className="h-5 w-16 rounded bg-muted" />
                </div>
                <div className="h-4 w-20 rounded bg-muted" />
              </div>
              {/* Recent divider */}
              <div className="flex items-center gap-2 my-2">
                <div className="h-3 w-8 rounded bg-muted" />
                <div className="flex-1 h-px bg-muted" />
              </div>
              {/* Game info row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-muted" />
                  <div className="h-4 w-12 rounded bg-muted" />
                  <div className="h-4 w-14 rounded bg-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-16 rounded-md bg-muted" />
                  <div className="h-8 w-24 rounded-md bg-muted" />
                </div>
              </div>
            </div>
          </div>

          {/* Feed skeleton */}
          <FeedSkeleton count={5} />
        </div>
      </div>
    </>
  );
}

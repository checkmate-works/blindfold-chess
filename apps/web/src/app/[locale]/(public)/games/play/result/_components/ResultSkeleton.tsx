import { Skeleton } from '@/app/[locale]/_components';

/**
 * Loading skeleton for the result page, mirroring {@link ResultClient}'s
 * loaded layout (outcome → stats overview → action buttons) so the page
 * doesn't flash empty while the game loads from localStorage and so the
 * Suspense fallback reserves the same space.
 *
 * The outcome block uses a neutral icon+title placeholder (win/loss/draw is
 * not known until the game loads), and the effort strip uses a fixed cell
 * count as a visual stand-in for the real per-move row.
 */
export function ResultSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      <div className="flex flex-col gap-4">
        {/* Outcome. Sized to the win VictoryCertificate (CertificateFrame is
            w-full @ 3:2), the tallest outcome variant, so a win — the case
            with the largest footprint — hands off without a jump. Loss/draw
            render a shorter icon+title, so they settle upward slightly. */}
        <Skeleton className="w-full aspect-[3/2] rounded-md" />

        <div className="border-t border-border" />

        {/* Stats overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card px-3 py-3 flex flex-col items-center gap-2"
              >
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>

          {/* Per-move effort strip */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="w-5 h-5 rounded-sm" />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Action buttons */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

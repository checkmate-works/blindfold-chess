// Import the leaf directly (not the `_components` barrel): this skeleton is also
// rendered by PlayClient as the finished-game → result transition bridge, and
// pulling the whole barrel there would drag in next-intl navigation modules.
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

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
          {/* Section title (underlined h2 on the result page) */}
          <Skeleton className="h-6 w-28" />

          {/* Opponent + player-colour / opening rows, mirroring
              GameStatsOverview: the engine badge line, then the colour chip +
              opening tag row added beneath it. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-[18px] w-[18px] rounded" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
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

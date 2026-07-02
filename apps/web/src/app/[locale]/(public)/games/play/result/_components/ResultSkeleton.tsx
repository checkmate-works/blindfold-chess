// Import the leaf directly (not the `_components` barrel): this skeleton is also
// rendered by PlayClient as the finished-game → result transition bridge, and
// pulling the whole barrel there would drag in next-intl navigation modules.
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Loading skeleton for the result page, mirroring {@link ResultClient}'s
 * loaded layout so the page doesn't flash empty while the game loads from
 * localStorage and the Suspense fallback reserves the same space. The result
 * screen now renders the shared `GameReview` (board + move list, then stats),
 * so this mirrors that: compact outcome header → 2/3 board + 1/3 move list →
 * stats overview → action buttons. Also rendered by PlayClient as the
 * finished-game → result transition bridge.
 */
export function ResultSkeleton() {
  return (
    <div aria-hidden className="space-y-8">
      {/* Compact outcome header (icon + title), centered. */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Board (2/3) + move list (1/3), matching GameReview's grid. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="aspect-square w-full rounded-md" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>

      {/* Stats overview */}
      <div className="space-y-4">
        {/* Section title (underlined h2 on the result page) */}
        <Skeleton className="h-6 w-28" />

        {/* Engine badge line, then colour chip + opening tag row. */}
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
              <Skeleton key={i} className="h-5 w-5 rounded-sm" />
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

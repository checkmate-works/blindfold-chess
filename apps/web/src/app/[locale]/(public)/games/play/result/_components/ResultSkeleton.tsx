// Import the leaf directly (not the `_components` barrel): this skeleton is
// rendered from `loading.tsx` and the page's Suspense boundary, and pulling the
// whole barrel in would drag in next-intl navigation modules.
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Loading skeleton for the result page, mirroring {@link ResultClient}'s loaded
 * layout — the shared `GameReview` in `local` mode — so the page doesn't flash
 * empty while the game loads from localStorage and the Suspense fallback
 * reserves the same space. That layout is: a 2/3 board + 1/3 move-list grid,
 * then the [Summary | Discussion] tab row, then (Summary is the default tab) the
 * Game Stats overview — section title → win/loss/draw label → initial settings →
 * per-move effort strip. There are no trailing action buttons: the postmortem /
 * open-game actions moved to the breadcrumb (see ResultBreadcrumb).
 */
export function ResultSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      {/* Board (2/3) + move list (1/3), matching GameReview's grid. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="aspect-square w-full rounded-md" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>

      {/* Overview: the [Summary | Discussion] tab row, then the Summary tab's
          Game Stats block (the default view). */}
      <div className="space-y-4">
        {/* Tab row (underline style): two text tabs over a bottom border. */}
        <div className="flex border-b border-border">
          <div className="px-4 py-2">
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="px-4 py-2">
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        {/* Game Stats overview */}
        <div className="space-y-4">
          {/* Section title (underlined h2). */}
          <Skeleton className="h-6 w-28" />

          {/* Win/loss/draw outcome label (icon + text), directly under the title. */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-28" />
          </div>

          {/* Initial settings: heading, engine badge line, colour chip + opening. */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
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
          </div>

          {/* Per-move effort strip: title + hint, cells, legend. */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-5 rounded-sm" />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-16" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

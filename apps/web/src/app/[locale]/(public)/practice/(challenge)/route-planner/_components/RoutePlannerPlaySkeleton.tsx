import { Skeleton } from '@/app/[locale]/_components';

/**
 * Loading fallback shaped like the route-planner playing screen
 * (`RoutePlannerSession`'s `gameState === 'playing'` branch): the problem header
 * (piece badge + start/target squares), the moves-history row, the coordinate
 * keypad (piece / file / rank rows + submit button), and the score counter.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the
 * `!problem` case, where the next render is the *playing* screen (training's
 * initial batch generation), not a result panel. The surrounding PageTitle /
 * PagePanel / Breadcrumb chrome is already in the DOM, so this only fills the
 * inner play area.
 */
export function RoutePlannerPlaySkeleton() {
  return (
    <div className="min-h-screen max-w-md mx-auto">
      <div className="text-center">
        {/* Problem header: piece badge + start/target squares */}
        <div className="flex justify-center items-center gap-6 pb-4 mb-4">
          <Skeleton className="h-14 w-14 rounded-lg" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="h-4 w-12" disableAnimation />
              <Skeleton className="h-6 w-10" />
            </div>
            <Skeleton className="h-4 w-4 rounded-full" disableAnimation />
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="h-4 w-12" disableAnimation />
              <Skeleton className="h-6 w-10" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Moves history row */}
          <Skeleton className="h-12 w-full rounded-md" />

          {/* Coordinate keypad */}
          <div className="flex flex-col gap-3 p-4">
            {/* Piece row (5 read-only indicators) */}
            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-9 rounded-md" disableAnimation />
              ))}
            </div>
            {/* File row */}
            <Skeleton className="h-11 sm:h-9 w-full" />
            {/* Rank row */}
            <Skeleton className="h-11 sm:h-9 w-full" />
            {/* Submit button */}
            <Skeleton className="mt-2 h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Score counter */}
      <div className="mt-8 flex justify-center items-center gap-12">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

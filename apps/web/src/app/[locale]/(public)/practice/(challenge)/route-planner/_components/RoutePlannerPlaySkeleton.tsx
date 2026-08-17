import {
  PlayHeaderSkeleton,
  PlayQuitLinkSkeleton,
  PlayScoreCounterSkeleton,
} from '@/app/[locale]/(public)/practice/_components/PlaySkeletonParts';
import { Skeleton } from '@/app/[locale]/_components';

type Props = {
  /**
   * Render the challenge-only lives/timer header row, widen the container to
   * `max-w-2xl`, and left-align the problem header — matching the challenge
   * playing screen (`RoutePlannerChallengeSession` + `SessionHeader`). The
   * training playing screen (`RoutePlannerSession`) has none of these, so it
   * defaults to off.
   */
  showHeader?: boolean;
};

/**
 * Loading fallback shaped like the route-planner playing screen: the problem
 * header (piece badge + start/target squares), the moves-history row, the
 * coordinate keypad (piece / file / rank rows + submit button), and the score
 * counter. With `showHeader`, it also renders the challenge lives/timer row.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the cases
 * where the next render is the *playing* screen (training's initial batch
 * generation; challenge's pre-first-problem state). The challenge session still
 * uses `PracticeResultSkeleton` for its `isFinished` state, where it navigates
 * to the separate result page. The surrounding PageTitle / PagePanel /
 * Breadcrumb chrome is already in the DOM, so this only fills the inner play
 * area.
 */
export function RoutePlannerPlaySkeleton({ showHeader = false }: Props) {
  return (
    <div className={`min-h-screen mx-auto ${showHeader ? 'max-w-2xl' : 'max-w-md'}`}>
      <div className={showHeader ? '' : 'text-center'}>
        {/* Lives (left) + pause/timer (right) header — challenge only */}
        {showHeader && <PlayHeaderSkeleton className="flex justify-between items-center mb-4" />}

        {/* Problem header: piece badge + start/target squares */}
        <div
          className={`flex items-center gap-6 pb-4 mb-4 ${
            showHeader ? 'justify-start' : 'justify-center'
          }`}
        >
          <Skeleton className="h-14 w-14 rounded-lg" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="h-4 w-12 rounded-md" disableAnimation />
              <Skeleton className="h-6 w-10 rounded-md" />
            </div>
            <Skeleton className="h-4 w-4 rounded-full" disableAnimation />
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="h-4 w-12 rounded-md" disableAnimation />
              <Skeleton className="h-6 w-10 rounded-md" />
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
            <Skeleton className="h-11 sm:h-9 w-full rounded-md" />
            {/* Rank row */}
            <Skeleton className="h-11 sm:h-9 w-full rounded-md" />
            {/* Submit button */}
            <Skeleton className="mt-2 h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Score counter */}
      <PlayScoreCounterSkeleton className="mt-8 flex justify-center items-center gap-12" />

      {/* Quit / end-training link */}
      <PlayQuitLinkSkeleton className="mt-6 flex justify-center" />
    </div>
  );
}

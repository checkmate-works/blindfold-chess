import { BoardSkeleton } from '@/app/_components';

import {
  PlayHeaderSkeleton,
  PlayQuitLinkSkeleton,
  PlayScoreCounterSkeleton,
} from '@/app/[locale]/(public)/practice/_components/PlaySkeletonParts';
import { Skeleton } from '@/app/[locale]/_components';

type Props = {
  /**
   * Render the challenge-only lives/timer header row. The training playing
   * screen has no such header, so it defaults to off.
   */
  showHeader?: boolean;
};

/**
 * Loading fallback shaped like the quadrants playing screen
 * (`QuadrantsPlaying` / `QuadrantsTrainingPlaying`): an optional lives/timer
 * header, the orientation indicator, the question prompt, the quadrant board,
 * the score counter, and the bottom quit/end link.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the cases
 * where the next render is the *playing* screen (training's initial batch
 * generation; challenge's pre-first-question state). The challenge session
 * still uses `PracticeResultSkeleton` for its `isFinished` state, where it is
 * navigating to the separate result page. The surrounding PageTitle /
 * PageLayout / Breadcrumb chrome is already in the DOM, so this only fills the
 * inner play area.
 */
export function QuadrantsPlaySkeleton({ showHeader = false }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="p-6 text-center overflow-hidden space-y-4">
        {/* Lives (left) + pause/timer (right) header — challenge only */}
        {showHeader && <PlayHeaderSkeleton className="flex justify-between items-center" />}

        {/* Orientation indicator (dot + label) */}
        <div className="flex justify-center items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" disableAnimation />
          <Skeleton className="h-5 w-24 rounded-md" disableAnimation />
        </div>

        {/* Question prompt */}
        <Skeleton className="h-8 w-48 mx-auto rounded-md" disableAnimation />

        {/* Quadrant board */}
        <div className="-mx-6 sm:mx-0">
          <div className="mx-auto w-full max-w-xs sm:max-w-sm">
            <BoardSkeleton />
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

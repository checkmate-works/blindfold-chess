import { BoardSkeleton } from '@/app/_components';

import { Skeleton } from '@/app/[locale]/_components';

type Props = {
  /**
   * Render the challenge-only lives/timer header row. The training playing
   * screen has no such header, so it defaults to off.
   */
  showHeader?: boolean;
};

/**
 * Loading fallback shaped like the coordinate-quiz playing screen
 * (`CoordinateQuizChallengePlaying` / `CoordinateQuizTrainingPlaying`): an
 * optional lives/timer header, the orientation indicator, the square board,
 * the score counter, and the bottom quit/end link.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the cases
 * where the next render is the *playing* screen (training's initial question
 * generation; challenge's pre-first-question state). The challenge session
 * still uses `PracticeResultSkeleton` for its `isFinished` state, where it is
 * navigating to the separate result page. The surrounding PageTitle /
 * PageLayout / Breadcrumb chrome is already in the DOM, so this only fills the
 * inner play area.
 */
export function CoordinateQuizPlaySkeleton({ showHeader = false }: Props) {
  return (
    <div className="-mx-4 p-8 text-center overflow-hidden sm:mx-0">
      <div className="max-w-md mx-auto mb-8">
        {/* Lives (left) + pause/timer (right) header — challenge only */}
        {showHeader && (
          <div className="mb-4 flex items-center justify-between min-h-[50px]">
            <Skeleton className="h-5 w-28 rounded-md" disableAnimation />
            <Skeleton className="h-10 w-10 rounded-full" disableAnimation />
          </div>
        )}

        {/* Orientation indicator (dot + label) */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" disableAnimation />
          <Skeleton className="h-5 w-24 rounded-md" disableAnimation />
        </div>

        {/* Square board */}
        <div className="-mx-8 sm:mx-0">
          <BoardSkeleton />
        </div>
      </div>

      {/* Score counter */}
      <div className="mt-4 flex justify-center items-center gap-12">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>

      {/* Quit / end-training link */}
      <div className="mt-6 flex justify-center">
        <Skeleton className="h-5 w-24 rounded-md" disableAnimation />
      </div>
    </div>
  );
}

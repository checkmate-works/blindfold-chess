import { Skeleton } from '@/app/[locale]/_components';

type Props = {
  /**
   * Render the challenge-only lives/timer header row. The training playing
   * screen has no such header, so it defaults to off.
   */
  showHeader?: boolean;
};

/**
 * Loading fallback shaped like the board-symmetry playing screen
 * (`BoardSymmetryPlaying` / `BoardSymmetryTrainingPlaying`): the question
 * heading, an optional lives/timer header, the `square → ?` transform display,
 * the file/rank coordinate keypad, the score counter, and the bottom quit/end
 * link.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the cases
 * where the next render is the *playing* screen (training's initial problem
 * generation; challenge's pre-first-problem state). The challenge session still
 * uses `PracticeResultSkeleton` for its `isFinished` state, where it is
 * navigating to the separate result page. The surrounding PageTitle /
 * PageLayout / Breadcrumb chrome is already in the DOM, so this only fills the
 * inner play area.
 */
export function BoardSymmetryPlaySkeleton({ showHeader = false }: Props) {
  return (
    <div className="max-w-md mx-auto">
      <div className="p-8 text-center overflow-hidden">
        {/* Question heading */}
        <Skeleton className="mx-auto mb-8 h-8 w-3/4" disableAnimation />

        {/* Lives (left) + pause/timer (right) header — challenge only */}
        {showHeader && (
          <div className="mb-6 flex justify-between items-center">
            <Skeleton className="h-5 w-28" disableAnimation />
            <Skeleton className="h-10 w-10 rounded-full" disableAnimation />
          </div>
        )}

        {/* `square → ?` transform display */}
        <div className="mb-8">
          <Skeleton className="mx-auto mb-4 h-[60px] w-48" />
        </div>

        {/* File/rank coordinate keypad + keyboard hint */}
        <div className="space-y-4 -mx-8 sm:mx-0">
          <div className="flex flex-col gap-2 max-w-md mx-auto">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="mx-auto h-4 w-40" disableAnimation />
        </div>
      </div>

      {/* Score counter */}
      <div className="mt-4 flex justify-center items-center gap-12">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>

      {/* Quit / end-training link */}
      <div className="mt-4 flex justify-center">
        <Skeleton className="h-5 w-24" disableAnimation />
      </div>
    </div>
  );
}

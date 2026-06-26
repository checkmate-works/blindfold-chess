import { Skeleton } from '@/app/[locale]/_components';

type Props = {
  /**
   * Render the challenge header row placeholder (lives + timer). The training
   * playing screen has no such header, so it defaults to off.
   */
  showHeader?: boolean;
};

/**
 * Loading fallback shaped like the diagonal-quiz playing screen
 * (`DiagonalQuizTrainingPlaying` / `DiagonalQuizPlaying`): a centered prompt,
 * optional lives/timer header, the large target square, two diagonal input
 * fields, the coordinate keypad, and the score counter.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the cases
 * where the next render is the *playing* screen (training's initial batch
 * generation; challenge's pre-first-square state). The challenge session still
 * uses `PracticeResultSkeleton` for its `isFinished` state, where it is
 * navigating to the separate result page. The surrounding PageTitle /
 * PageLayout / Breadcrumb chrome is already in the DOM, so this only fills the
 * inner play area.
 */
export function DiagonalQuizPlaySkeleton({ showHeader = false }: Props) {
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center">
        {/* Question prompt */}
        <Skeleton className="h-7 w-3/4 mx-auto mb-4" />

        {/* Lives (left) + timer (right) header */}
        {showHeader && (
          <div className="flex justify-between items-center mb-4 min-h-[40px]">
            <Skeleton className="h-5 w-20" disableAnimation />
            <Skeleton className="h-10 w-10 rounded-full" disableAnimation />
          </div>
        )}

        {/* Target square */}
        <div className="mb-6">
          <Skeleton className="h-16 w-24 mx-auto" />
        </div>

        {/* Two diagonal input fields (left-aligned label + full-width input) */}
        <div className="space-y-3 mb-6">
          {[0, 1].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-1" disableAnimation />
              <Skeleton className="h-[52px] w-full rounded-lg" />
            </div>
          ))}
        </div>

        {/* Coordinate keypad: file row, rank row, action row */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="mt-1 h-11 w-full" />
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

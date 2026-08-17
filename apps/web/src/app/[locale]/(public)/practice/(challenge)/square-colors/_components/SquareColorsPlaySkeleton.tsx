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
 * Loading fallback shaped like the square-colors playing screen
 * (`SquareColorsPlaying` / `SquareColorsTrainingPlaying`): an optional
 * lives/timer header, the large square-name prompt, the two light/dark answer
 * buttons, the score counter, and the bottom quit/end link.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the cases
 * where the next render is the *playing* screen (training's initial batch
 * generation; challenge's pre-first-square state). The challenge session still
 * uses `PracticeResultSkeleton` for its `isFinished` state, where it is
 * navigating to the separate result page. The surrounding PageTitle /
 * PageLayout / Breadcrumb chrome is already in the DOM, so this only fills the
 * inner play area.
 */
export function SquareColorsPlaySkeleton({ showHeader = false }: Props) {
  return (
    <div className="max-w-md mx-auto">
      <div className="p-8 text-center overflow-hidden">
        {/* Lives (left) + pause/timer (right) header — challenge only */}
        {showHeader && (
          <div className="mb-6">
            <PlayHeaderSkeleton className="mt-2 flex justify-between items-center" />
          </div>
        )}

        {/* Square-name prompt */}
        <div className="mb-8">
          <Skeleton className="mx-auto mb-4 h-[60px] w-28 rounded-md" />
        </div>

        {/* Light / dark answer buttons */}
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          <Skeleton className="aspect-square rounded-md" />
          <Skeleton className="aspect-square rounded-md" />
        </div>
      </div>

      {/* Score counter */}
      <PlayScoreCounterSkeleton className="mt-8 flex justify-center items-center gap-12" />

      {/* Quit / end-training link */}
      <PlayQuitLinkSkeleton className="mt-6 flex justify-center" />
    </div>
  );
}

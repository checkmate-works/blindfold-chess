import { Skeleton } from '@/app/[locale]/_components';

type Props = {
  /**
   * Render the challenge-only lives/timer header row. The training playing
   * screen has no such header, so it defaults to off.
   */
  showHeader?: boolean;
};

/**
 * Loading fallback shaped like the legal-moves playing screen
 * (`LegalMovesPlaying` / `LegalMovesTrainingPlaying`): an optional lives/timer
 * header, the question prompt + piece glyph, the two legal/illegal answer
 * buttons, the score counter, and the bottom quit/end link.
 *
 * This replaces the result-panel-shaped `PracticeResultSkeleton` for the cases
 * where the next render is the *playing* screen (training's initial batch
 * generation; challenge's pre-first-question state). The challenge session
 * still uses `PracticeResultSkeleton` for its `isFinished` state, where it is
 * navigating to the separate result page. The surrounding PageTitle /
 * PageLayout / Breadcrumb chrome is already in the DOM, so this only fills the
 * inner play area.
 */
export function LegalMovesPlaySkeleton({ showHeader = false }: Props) {
  return (
    <div>
      <div className="relative p-8 text-center overflow-hidden">
        {/* Lives (left) + pause/timer (right) header — challenge only */}
        {showHeader && (
          <div className="mb-8 flex items-center justify-between">
            <Skeleton className="h-5 w-28" disableAnimation />
            <Skeleton className="h-10 w-10 rounded-full" disableAnimation />
          </div>
        )}

        {/* Question prompt + piece glyph */}
        <div className="mb-8 min-h-[160px] flex flex-col items-center justify-center">
          <Skeleton className="mb-6 h-7 w-3/4" disableAnimation />
          <Skeleton className="h-[72px] w-16" />
        </div>

        {/* Legal / illegal answer buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[60px] rounded-md" />
          <Skeleton className="h-[60px] rounded-md" />
        </div>
      </div>

      {/* Score counter */}
      <div className="mt-8 flex justify-center items-center gap-12">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>

      {/* Quit / end-training link */}
      <div className="mt-6 flex justify-center">
        <Skeleton className="h-5 w-24" disableAnimation />
      </div>
    </div>
  );
}

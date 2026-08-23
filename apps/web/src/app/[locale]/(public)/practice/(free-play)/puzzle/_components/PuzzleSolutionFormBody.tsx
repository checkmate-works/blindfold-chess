'use client';

import { useTranslations } from 'next-intl';

import { FormErrorBanner, LocalizedUnsavedChangesDialog } from '@/app/_components';

import type { PuzzleSolutionStepApi } from '../_hooks/use-puzzle-solution-step';
import { PuzzleSolutionFields } from './PuzzleSolutionFields';
import { PuzzleSolutionSkeleton } from './PuzzleSolutionSkeleton';
import { PuzzleStepIndicator } from './PuzzleStepIndicator';

type Props = {
  /** Which wizard the step indicator should draw. */
  flow: 'create' | 'edit';
  step: PuzzleSolutionStepApi;
  onContinueToPreview: () => void;
};

/**
 * The rendering half of the puzzle solution step, shared by the create and
 * edit wizards.
 *
 * @description
 * `usePuzzleSolutionStep` already unified the behaviour of the two forms;
 * this is the markup that was still copied between them — the step indicator,
 * the pre-hydration skeleton, the error banner, the fields, and the
 * unsaved-changes dialog. What genuinely differs (which sessionStorage slot
 * the draft lives in, where Back and Continue lead) is decided by the two
 * callers and reaches the hook, not this component; the only thing left to
 * pass here is which flow the indicator is drawing.
 *
 * Rendering the skeleton before `step.ready` is not cosmetic: the draft lives
 * in sessionStorage, which is empty during SSR, so hydrating the real fields
 * from a lazy initializer would mismatch. Same rationale as
 * `PuzzlePreviewClient`.
 */
export function PuzzleSolutionFormBody({ flow, step, onContinueToPreview }: Props) {
  const t = useTranslations('practice.puzzle.create');

  const stepIndicator = <PuzzleStepIndicator flow={flow} current="solution" />;

  if (!step.ready) {
    return (
      <div className="space-y-6">
        {stepIndicator}
        <PuzzleSolutionSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {stepIndicator}

        <FormErrorBanner message={step.error} />

        <PuzzleSolutionFields
          flipped={step.flipped}
          onFlip={step.toggleFlip}
          solution={step.solution}
          pending={false}
          onBack={step.handleBack}
          backLabel={t('backToPosition')}
          onPrimaryAction={onContinueToPreview}
          primaryActionLabel={t('continueToPreview')}
          primaryActionDisabled={step.solution.moves.length === 0}
        />
      </div>

      <LocalizedUnsavedChangesDialog
        open={step.isBlocking}
        onConfirm={step.confirmLeave}
        onCancel={step.cancelLeave}
      />
    </>
  );
}

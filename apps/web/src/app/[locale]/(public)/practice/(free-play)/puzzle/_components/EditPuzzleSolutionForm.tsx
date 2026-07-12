'use client';

import { useTranslations } from 'next-intl';

import { usePuzzleSolutionStep } from '../_hooks/use-puzzle-solution-step';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { readEditDraft, writeEditDraft } from '../_lib/edit-draft-storage';
import { validatePuzzleSolution } from '../_lib/validate-puzzle-form';
import { PuzzleFormErrorBanner } from './PuzzleFormErrorBanner';
import { PuzzleSolutionFields } from './PuzzleSolutionFields';
import { PuzzleSolutionSkeleton } from './PuzzleSolutionSkeleton';
import { PuzzleStepIndicator } from './PuzzleStepIndicator';
import { PuzzleUnsavedChangesDialog } from './PuzzleUnsavedChangesDialog';

type Props = {
  positionId: string;
};

export function EditPuzzleSolutionForm({ positionId }: Props) {
  const t = useTranslations('practice.puzzle.create');

  const step = usePuzzleSolutionStep<PuzzleEditDraftV1>({
    read: () => readEditDraft(positionId),
    // The solution step always requires a position-step visit first — never
    // falls back to seeding from the DB directly, which would let the
    // position screen be skipped via a direct URL hit.
    missingDraftPath: `/practice/puzzle/${positionId}/edit`,
    write: (draft, moves, notes) => writeEditDraft(positionId, { ...draft, moves, notes }),
    backPath: `/practice/puzzle/${positionId}/edit`,
    draftWriteFailedMessage: t('draftWriteFailed'),
  });

  function handleContinueToPreview() {
    if (!validatePuzzleSolution(step.solution, t('solutionRequired'))) return;
    step.persistAndNavigate(`/practice/puzzle/${positionId}/edit/preview`);
  }

  const stepIndicator = <PuzzleStepIndicator flow="edit" current="solution" />;

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

        <PuzzleFormErrorBanner message={step.error} />

        <PuzzleSolutionFields
          flipped={step.flipped}
          onFlip={step.toggleFlip}
          solution={step.solution}
          pending={false}
          onBack={step.handleBack}
          backLabel={t('backToPosition')}
          onPrimaryAction={handleContinueToPreview}
          primaryActionLabel={t('continueToPreview')}
          primaryActionDisabled={step.solution.moves.length === 0}
        />
      </div>

      <PuzzleUnsavedChangesDialog
        open={step.isBlocking}
        onConfirm={step.confirmLeave}
        onCancel={step.cancelLeave}
      />
    </>
  );
}

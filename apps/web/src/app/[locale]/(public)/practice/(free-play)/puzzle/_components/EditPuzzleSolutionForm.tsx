'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { updatePuzzle } from '../_actions/updatePuzzle';
import { usePuzzleSolutionStep } from '../_hooks/use-puzzle-solution-step';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { clearEditDraft, readEditDraft, writeEditDraft } from '../_lib/edit-draft-storage';
import { validatePuzzleSolution } from '../_lib/validate-puzzle-form';
import { PuzzleFormErrorBanner } from './PuzzleFormErrorBanner';
import { PuzzleSolutionFields } from './PuzzleSolutionFields';
import { PuzzleStepIndicator } from './PuzzleStepIndicator';
import { PuzzleUnsavedChangesDialog } from './PuzzleUnsavedChangesDialog';

type Props = {
  positionId: string;
};

export function EditPuzzleSolutionForm({ positionId }: Props) {
  const t = useTranslations('practice.puzzle.create');
  const tEdit = useTranslations('practice.puzzle.edit');

  const [saving, setSaving] = useState(false);

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

  async function handleSave() {
    step.setError(null);
    if (!step.draft) return;
    if (!validatePuzzleSolution(step.solution, t('solutionRequired'))) return;

    setSaving(true);
    try {
      const result = await updatePuzzle({
        id: positionId,
        fen: step.draft.fen,
        title: step.draft.title,
        description: step.draft.description || null,
        solutionMoves: step.solution.moves.map((san, i) => ({
          san,
          note: step.solution.notes[i] || null,
        })),
        themeIds: step.draft.themeIds,
        chunkIds: step.draft.chunkIds,
      });

      if ('error' in result) {
        step.setError(result.error);
        return;
      }

      clearEditDraft(positionId);
      step.finishNavigation(`/practice/puzzle/${positionId}?toast=puzzle_updated`);
    } catch {
      step.setError(tEdit('saveError'));
    } finally {
      setSaving(false);
    }
  }

  const stepIndicator = <PuzzleStepIndicator flow="edit" current="solution" />;

  if (!step.ready) {
    return (
      <div className="space-y-6">
        {stepIndicator}
        <div className="h-32 animate-pulse rounded bg-muted/30" />
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
          pending={saving}
          onBack={step.handleBack}
          backLabel={t('backToPosition')}
          onPrimaryAction={handleSave}
          primaryActionLabel={saving ? tEdit('submitting') : tEdit('submit')}
          primaryActionDisabled={step.solution.moves.length === 0}
          primaryActionLoading={saving}
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

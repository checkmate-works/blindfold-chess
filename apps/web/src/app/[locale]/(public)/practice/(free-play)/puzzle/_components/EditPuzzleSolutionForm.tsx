'use client';

import { useTranslations } from 'next-intl';

import { usePuzzleSolutionStep } from '../_hooks/use-puzzle-solution-step';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { readEditDraft, writeEditDraft } from '../_lib/edit-draft-storage';
import { validatePuzzleSolution } from '../_lib/validate-puzzle-form';
import { PuzzleSolutionFormBody } from './PuzzleSolutionFormBody';

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

  return (
    <PuzzleSolutionFormBody flow="edit" step={step} onContinueToPreview={handleContinueToPreview} />
  );
}

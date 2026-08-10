'use client';

import { useTranslations } from 'next-intl';

import { usePuzzleSolutionStep } from '../_hooks/use-puzzle-solution-step';
import { readDraft, writeDraft } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { validatePuzzleSolution } from '../_lib/validate-puzzle-form';
import { PuzzleSolutionFormBody } from './PuzzleSolutionFormBody';

type Props = {
  /** Mirrors CreatePuzzlePositionForm's — disabled behind the guest gate. */
  disableUnsavedGuard?: boolean;
};

export function CreatePuzzleSolutionForm({ disableUnsavedGuard = false }: Props = {}) {
  const t = useTranslations('practice.puzzle.create');

  const step = usePuzzleSolutionStep<PuzzleDraftV1>({
    read: readDraft,
    missingDraftPath: '/practice/puzzle/new',
    write: (draft, moves, notes) => writeDraft({ ...draft, moves, notes }),
    // `?resumed=1` tells the position step this is an in-session Back, so
    // it hydrates silently without the "continuing from a draft" banner.
    backPath: '/practice/puzzle/new?resumed=1',
    disableUnsavedGuard,
    draftWriteFailedMessage: t('draftWriteFailed'),
  });

  function handleContinueToPreview() {
    if (!validatePuzzleSolution(step.solution, t('solutionRequired'))) return;
    step.persistAndNavigate('/practice/puzzle/new/preview');
  }

  return (
    <PuzzleSolutionFormBody
      flow="create"
      step={step}
      onContinueToPreview={handleContinueToPreview}
    />
  );
}

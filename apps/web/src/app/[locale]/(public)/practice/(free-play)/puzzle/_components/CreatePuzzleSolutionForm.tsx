'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import { useMoveSubmitLabels } from '../_hooks/use-move-submit-labels';
import { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';
import { readDraft, writeDraft } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { validatePuzzleSolution } from '../_lib/validate-puzzle-form';
import { PuzzleSolutionFields } from './PuzzleSolutionFields';

type Props = {
  /** Mirrors CreatePuzzlePositionForm's — disabled behind the guest gate. */
  disableUnsavedGuard?: boolean;
};

export function CreatePuzzleSolutionForm({ disableUnsavedGuard = false }: Props = {}) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');
  const tUnsaved = useTranslations('unsavedChanges');
  const moveSubmitLabels = useMoveSubmitLabels();

  const [draft, setDraft] = useState<PuzzleDraftV1 | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const solution = usePuzzleSolutionMoves({ baseFen: draft?.fen ?? '', moveSubmitLabels });

  // Baseline moves/notes as of hydration — dirty-check compares against
  // this, not against empty, so re-entering this step with an already
  // populated draft doesn't immediately read as "unsaved changes."
  const initialMovesRef = useRef<string[]>([]);
  const initialNotesRef = useRef<string[]>([]);

  useEffect(() => {
    const d = readDraft();
    if (!d) {
      router.replace('/practice/puzzle/new');
      return;
    }
    setDraft(d);
    solution.setMoves(d.moves);
    solution.setNotes(d.notes);
    setFlipped(d.flipped);
    initialMovesRef.current = d.moves;
    initialNotesRef.current = d.notes;
    setHydrated(true);
    // Runs once on mount, same rationale as PuzzlePreviewClient's hydration
    // effect — re-running on `solution` identity changes would re-hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const movesChanged =
    solution.moves.length !== initialMovesRef.current.length ||
    solution.moves.some((m, i) => m !== initialMovesRef.current[i]);
  const notesChanged =
    solution.notes.length !== initialNotesRef.current.length ||
    solution.notes.some((n, i) => n !== initialNotesRef.current[i]);
  const isDirty = hydrated && !submitted && (movesChanged || notesChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  function persistDraft(): boolean {
    if (!draft) return false;
    return writeDraft({
      ...draft,
      moves: solution.moves,
      notes: solution.notes,
    });
  }

  function handleBack() {
    setError(null);
    if (!persistDraft()) {
      setError(t('draftWriteFailed'));
      return;
    }
    flushSync(() => setSubmitted(true));
    router.push('/practice/puzzle/new?resumed=1');
  }

  function handleContinueToPreview() {
    setError(null);
    if (!validatePuzzleSolution(solution, t('solutionRequired'))) return;
    if (!persistDraft()) {
      setError(t('draftWriteFailed'));
      return;
    }
    flushSync(() => setSubmitted(true));
    router.push('/practice/puzzle/new/preview');
  }

  if (!hydrated || !draft) {
    // Same SSR/hydration-mismatch rationale as PuzzlePreviewClient: a lazy
    // `useState(() => readDraft())` initializer would mismatch since
    // `readDraft()` always returns null during SSR.
    return <div className="h-32 animate-pulse rounded bg-muted/30" />;
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        <PuzzleSolutionFields
          fen={draft.fen}
          flipped={flipped}
          onFlip={() => setFlipped((prev) => !prev)}
          solution={solution}
          pending={false}
          onBack={handleBack}
          backLabel={t('backToPosition')}
          onPrimaryAction={handleContinueToPreview}
          primaryActionLabel={t('continueToPreview')}
          primaryActionDisabled={solution.moves.length === 0}
        />
      </div>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </>
  );
}

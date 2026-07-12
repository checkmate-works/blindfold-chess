'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import { updatePuzzle } from '../_actions/updatePuzzle';
import { useMoveSubmitLabels } from '../_hooks/use-move-submit-labels';
import { usePuzzleSolutionMoves } from '../_hooks/use-puzzle-solution-moves';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { clearEditDraft, readEditDraft, writeEditDraft } from '../_lib/edit-draft-storage';
import { validatePuzzleSolution } from '../_lib/validate-puzzle-form';
import { PuzzleSolutionFields } from './PuzzleSolutionFields';

type Props = {
  positionId: string;
};

export function EditPuzzleSolutionForm({ positionId }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.puzzle.create');
  const tEdit = useTranslations('practice.puzzle.edit');
  const tUnsaved = useTranslations('unsavedChanges');
  const moveSubmitLabels = useMoveSubmitLabels();

  const [draft, setDraft] = useState<PuzzleEditDraftV1 | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const solution = usePuzzleSolutionMoves({ baseFen: draft?.fen ?? '', moveSubmitLabels });

  const initialMovesRef = useRef<string[]>([]);
  const initialNotesRef = useRef<string[]>([]);

  useEffect(() => {
    const d = readEditDraft(positionId);
    if (!d) {
      // The solution step always requires a position-step visit first —
      // never falls back to seeding from the DB directly, which would let
      // the position screen be skipped via a direct URL hit.
      router.replace(`/practice/puzzle/${positionId}/edit`);
      return;
    }
    setDraft(d);
    solution.setMoves(d.moves);
    solution.setNotes(d.notes);
    setFlipped(d.flipped);
    initialMovesRef.current = d.moves;
    initialNotesRef.current = d.notes;
    setHydrated(true);
    // Runs once on mount — re-running on `solution`/`positionId` identity
    // changes would re-hydrate over in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId, router]);

  const movesChanged =
    solution.moves.length !== initialMovesRef.current.length ||
    solution.moves.some((m, i) => m !== initialMovesRef.current[i]);
  const notesChanged =
    solution.notes.length !== initialNotesRef.current.length ||
    solution.notes.some((n, i) => n !== initialNotesRef.current[i]);
  const isDirty = hydrated && !submitted && (movesChanged || notesChanged);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  function handleBack() {
    setError(null);
    if (!draft) return;
    const ok = writeEditDraft(positionId, {
      ...draft,
      moves: solution.moves,
      notes: solution.notes,
    });
    if (!ok) {
      setError(t('draftWriteFailed'));
      return;
    }
    flushSync(() => setSubmitted(true));
    router.push(`/practice/puzzle/${positionId}/edit`);
  }

  async function handleSave() {
    setError(null);
    if (!draft) return;
    if (!validatePuzzleSolution(solution, t('solutionRequired'))) return;

    setSaving(true);
    try {
      const result = await updatePuzzle({
        id: positionId,
        fen: draft.fen,
        title: draft.title,
        description: draft.description || null,
        solutionMoves: solution.moves.map((san, i) => ({ san, note: solution.notes[i] || null })),
        themeIds: draft.themeIds,
        chunkIds: draft.chunkIds,
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      clearEditDraft(positionId);
      flushSync(() => setSubmitted(true));
      router.push(`/practice/puzzle/${positionId}?toast=puzzle_updated`);
    } catch {
      setError(tEdit('saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || !draft) {
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
          pending={saving}
          onBack={handleBack}
          backLabel={t('backToPosition')}
          onPrimaryAction={handleSave}
          primaryActionLabel={saving ? tEdit('submitting') : tEdit('submit')}
          primaryActionDisabled={solution.moves.length === 0}
          primaryActionLoading={saving}
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

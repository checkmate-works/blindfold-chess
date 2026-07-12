'use client';

import { useRef, useState } from 'react';

import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';

import type { useFenBoardEditor } from '../../_hooks/use-fen-board-editor';
import { validatePuzzlePosition } from '../_lib/validate-puzzle-form';

type BoardEditor = ReturnType<typeof useFenBoardEditor>;

type Options = {
  board: BoardEditor;
  /**
   * Solution moves/notes carried through this step untouched — seeded from
   * the edit flow's DB row, or the create flow's fork/injection payload.
   * They are only displayed downstream and used to detect whether the
   * position changed under them (see `handleContinue`).
   */
  initialMoves?: string[];
  initialNotes?: string[];
  /** The FEN `initialMoves` are valid against. */
  initialFen?: string;
  /**
   * Persist the whole step payload to sessionStorage (a closure over the
   * caller's field state), receiving the moves/notes to carry through.
   * Returns `false` on write failure (quota / private mode) — the hook then
   * surfaces `draftWriteFailedMessage` and stays on the form, since
   * navigating to a step that would immediately bounce back is worse UX.
   */
  writeDraft: (moves: string[], notes: string[]) => boolean;
  /** Route pushed after a successful draft write. */
  nextPath: string;
  draftWriteFailedMessage: string;
};

/**
 * Shared position-step flow logic for the create and edit forms: holds the
 * carried-through solution moves, runs the "position changed under existing
 * moves" confirmation guard on Continue, and hands off to the solution step
 * via `writeDraft` + navigation.
 */
export function usePuzzlePositionStep({
  board,
  initialMoves = [],
  initialNotes = [],
  initialFen = '',
  writeDraft,
  nextPath,
  draftWriteFailedMessage,
}: Options) {
  const router = useRouter();

  const [carriedMoves, setCarriedMoves] = useState<string[]>(initialMoves);
  const [carriedNotes, setCarriedNotes] = useState<string[]>(initialNotes);
  // The FEN `carriedMoves` are valid against. Reassigned via `seedCarried`
  // inside the hydration `apply` callback (not just at declaration) so a
  // restored draft's fen/moves pair is never compared against a stale value.
  const originalFenRef = useRef(initialFen);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [positionChangedOpen, setPositionChangedOpen] = useState(false);

  /**
   * Re-seed the carried moves/notes and the FEN they are valid against.
   * Called from draft hydration and from an explicit "start over" reset.
   */
  function seedCarried(moves: string[], notes: string[], fen: string) {
    setCarriedMoves(moves);
    setCarriedNotes(notes);
    originalFenRef.current = fen;
  }

  function writeAndContinue(moves: string[], notes: string[]) {
    const ok = writeDraft(moves, notes);
    if (!ok) {
      setError(draftWriteFailedMessage);
      setPending(false);
      return;
    }
    // flushSync ensures the re-render (isDirty -> false) completes before
    // router.push triggers the navigation guard check — otherwise the
    // intentional push would fire the UnsavedChangesDialog.
    flushSync(() => setSubmitted(true));
    router.push(nextPath);
  }

  function handleContinue() {
    setError(null);
    if (!validatePuzzlePosition(board)) return;

    setPending(true);

    const positionChanged = carriedMoves.length > 0 && board.trimmedFen !== originalFenRef.current;
    if (positionChanged) {
      setPositionChangedOpen(true);
      setPending(false);
      return;
    }

    writeAndContinue(carriedMoves, carriedNotes);
  }

  function confirmPositionChanged() {
    setPositionChangedOpen(false);
    setPending(true);
    seedCarried([], [], board.trimmedFen);
    writeAndContinue([], []);
  }

  function cancelPositionChanged() {
    setPositionChangedOpen(false);
  }

  return {
    carriedMoves,
    carriedNotes,
    seedCarried,
    error,
    setError,
    pending,
    submitted,
    positionChangedOpen,
    handleContinue,
    confirmPositionChanged,
    cancelPositionChanged,
  };
}

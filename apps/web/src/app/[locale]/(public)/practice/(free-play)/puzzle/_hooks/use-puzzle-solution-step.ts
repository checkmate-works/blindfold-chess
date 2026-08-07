'use client';

import { useEffect, useRef, useState } from 'react';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { useRouter } from '@/i18n/routing';
import { useLatestRef } from '@blindfold-chess/features/common/client';
import { flushSync } from 'react-dom';

import { stringArraysEqual } from '../_lib/string-arrays-equal';
import { useMoveSubmitLabels } from './use-move-submit-labels';
import { usePuzzleSolutionMoves } from './use-puzzle-solution-moves';

/** The draft fields the solution step itself reads and edits. */
type SolutionStepDraft = {
  fen: string;
  moves: string[];
  notes: string[];
  flipped: boolean;
};

type Options<T extends SolutionStepDraft> = {
  /**
   * Read this step's draft from sessionStorage. `null` (direct URL hit, or
   * a cleared/corrupt slot) bounces the user to `missingDraftPath` — the
   * solution step always requires a position-step visit first.
   */
  read: () => T | null;
  missingDraftPath: string;
  /** Persist the draft with the current moves/notes merged in. */
  write: (draft: T, moves: string[], notes: string[]) => boolean;
  /** The position step's route, pushed by `handleBack` after persisting. */
  backPath: string;
  /** Mirrors the position form's guest-gate escape hatch. */
  disableUnsavedGuard?: boolean;
  draftWriteFailedMessage: string;
};

/**
 * Shared solution-step flow logic for the create and edit forms: hydrates
 * the step from its sessionStorage draft on mount (bouncing back to the
 * position step when none exists), owns the solution-move entry state and
 * the board flip, and persists moves/notes back into the draft before any
 * intra-wizard navigation so a Back round-trip never loses data by itself.
 */
export function usePuzzleSolutionStep<T extends SolutionStepDraft>({
  read,
  missingDraftPath,
  write,
  backPath,
  disableUnsavedGuard = false,
  draftWriteFailedMessage,
}: Options<T>) {
  const router = useRouter();
  const moveSubmitLabels = useMoveSubmitLabels();

  const [draft, setDraft] = useState<T | null>(null);
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

  // `didHydrate` + the read ref keep this a strict once-on-mount handshake
  // (same rationale as usePuzzleDraftHydration): remounts or `router`
  // identity changes must not re-hydrate over in-progress edits.
  const didHydrate = useRef(false);
  const readRef = useLatestRef(read);

  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    const d = readRef.current();
    if (!d) {
      router.replace(missingDraftPath);
      return;
    }
    setDraft(d);
    solution.setMoves(d.moves);
    solution.setNotes(d.notes);
    setFlipped(d.flipped);
    initialMovesRef.current = d.moves;
    initialNotesRef.current = d.notes;
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const isDirty =
    hydrated &&
    !submitted &&
    (!stringArraysEqual(solution.moves, initialMovesRef.current) ||
      !stringArraysEqual(solution.notes, initialNotesRef.current));

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  /**
   * Flip `submitted` (relaxing the unsaved-changes guard) synchronously,
   * then navigate. Used directly by callers whose exit isn't a draft write
   * (the edit flow's save-to-server), and by `persistAndNavigate` below.
   */
  function finishNavigation(path: string) {
    flushSync(() => setSubmitted(true));
    router.push(path);
  }

  /** Persist the current moves/notes into the draft, then navigate; on a
   * failed write, surface the error and stay put. */
  function persistAndNavigate(path: string) {
    setError(null);
    if (!draft || !write(draft, solution.moves, solution.notes)) {
      setError(draftWriteFailedMessage);
      return;
    }
    finishNavigation(path);
  }

  function handleBack() {
    persistAndNavigate(backPath);
  }

  return {
    /** `false` until the draft has hydrated — render a skeleton meanwhile. */
    ready: hydrated && draft !== null,
    draft,
    flipped,
    toggleFlip: () => setFlipped((prev) => !prev),
    solution,
    error,
    setError,
    isBlocking,
    confirmLeave: confirm,
    cancelLeave: cancel,
    handleBack,
    persistAndNavigate,
    finishNavigation,
  };
}

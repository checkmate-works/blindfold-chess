'use client';

import { useEffect, useState } from 'react';

import { useMachine } from '@xstate/react';

import { aggregateResults } from '@/app/[locale]/(public)/practice/(free-play)/_lib/aggregate-results';

import { positionMemoryMachine } from '../_lib/machines/positionMemoryMachine';
import type { SessionMode } from '../_lib/machines/types';
import { getCustomPositions, getRandomPositions } from '../_lib/preset-problems';
import {
  type SerializedStats,
  type SessionCompletePayload,
  buildSerializedResults,
} from '../_lib/result-serde';
import type { PositionData } from '../_lib/types';

type UsePositionMemorySessionArgs = {
  timeLimit: number;
  shuffle: boolean;
  mode: SessionMode;
  /** Pre-built positions — when provided, `fens`/`problemCount` are ignored. */
  presetPositions?: PositionData[];
  fens?: string[];
  problemCount?: number;
  /** When true, the machine auto-advances past the memorize phase. */
  skipMemorize?: boolean;
  /** When true, the machine auto-advances past the inter-problem result. */
  skipProblemResult?: boolean;
  /** Called once when the machine enters `sessionResult`. */
  onSessionComplete: (payload: SessionCompletePayload) => void;
};

/**
 * Encapsulates the XState machine, client-side position initialization, and
 * the machine-driven side effects (tutorial auto-advance, single-position
 * auto-advance past the per-problem result screen, and session-complete
 * payload construction).
 *
 * Positions are generated inside a `useEffect` (not during render) so that
 * `Math.random()`-based shuffling does not cause an SSR/hydration mismatch.
 * The resulting positions are forwarded to the machine via `SET_POSITIONS`.
 */
export function usePositionMemorySession({
  timeLimit,
  shuffle,
  mode,
  presetPositions,
  fens,
  problemCount = 1,
  skipMemorize = false,
  skipProblemResult = false,
  onSessionComplete,
}: UsePositionMemorySessionArgs) {
  const [hasMounted, setHasMounted] = useState(false);
  const [positions, setPositions] = useState<PositionData[]>(() => presetPositions ?? []);

  const [state, send] = useMachine(positionMemoryMachine, {
    input: {
      positions: presetPositions ?? [],
      timeLimit,
      mode,
    },
  });

  useEffect(() => {
    if (hasMounted) return;
    setHasMounted(true);

    if (presetPositions && presetPositions.length > 0) {
      // Positions were supplied by the caller; machine already received them
      // via input, but send SET_POSITIONS so subsequent renders stay in sync
      // with component state.
      setPositions(presetPositions);
      send({ type: 'SET_POSITIONS', positions: presetPositions });
      return;
    }

    const initialPositions =
      fens && fens.length > 0
        ? getCustomPositions(fens, problemCount, shuffle)
        : getRandomPositions(problemCount, shuffle);
    setPositions(initialPositions);
    send({ type: 'SET_POSITIONS', positions: initialPositions });
  }, [hasMounted, presetPositions, fens, shuffle, problemCount, send]);

  // Skip the memorize phase immediately (tutorial flow).
  useEffect(() => {
    if (skipMemorize && state.value === 'memorize' && positions.length > 0) {
      send({ type: 'MEMORIZED' });
    }
  }, [skipMemorize, state.value, positions.length, send]);

  // Skip the inter-problem result screen (single-position flow).
  useEffect(() => {
    if (skipProblemResult && state.value === 'problemResult') {
      send({ type: 'VIEW_RESULTS' });
    }
  }, [skipProblemResult, state.value, send]);

  // Assemble the session-complete payload and delegate to the caller.
  const { problemResults, recreatedPositions, skippedProblems, totalMistakes } = state.context;
  useEffect(() => {
    if (state.value !== 'sessionResult') return;

    const { totalAccuracy, totalCorrect, totalPieces, totalIncorrect, totalMissing, totalExtra } =
      aggregateResults(Array.from(problemResults.values()));

    const results = buildSerializedResults({
      positions,
      problemResults,
      recreatedPositions,
      skippedProblems,
    });

    const stats: SerializedStats = {
      c: totalCorrect,
      t: totalPieces,
      i: totalIncorrect,
      m: totalMissing,
      e: totalExtra,
      k: totalMistakes,
    };

    onSessionComplete({ results, stats, totalAccuracy });
  }, [
    state.value,
    problemResults,
    skippedProblems,
    positions,
    recreatedPositions,
    totalMistakes,
    onSessionComplete,
  ]);

  return { state, send, positions, hasMounted } as const;
}

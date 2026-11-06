"use client";

import { useCallback, useMemo, useState } from "react";

import { calculateAccuracy, type PositionAccuracy } from "../common/accuracy";
import type { AccuracyDescriptions } from "./use-piece-accuracy";
import { EMPTY_BOARD_FEN } from "./board-edit";
import type { FenPosition } from "./problems";

/**
 * `recreate` — the player is building the position; `problem-result` — the
 * score of the problem just submitted is shown; `result` — the session is
 * over and the app moves on to its result screen.
 */
export type FenSessionPhase = "recreate" | "problem-result" | "result";

export type UseFenPracticeSessionConfig = {
  /** The session's problems in play order; read once, on first render. */
  positions: readonly FenPosition[];
  pieceNames: Record<string, string>;
  accuracyDescriptions: AccuracyDescriptions;
};

export type UseFenPracticeSessionReturn = {
  positions: readonly FenPosition[];
  phase: FenSessionPhase;
  currentProblemIndex: number;
  /** The problem being worked on, or null once the index runs past the end. */
  originalPosition: FenPosition | null;
  /** The player's board for the current problem. */
  recreatedPosition: string;
  setRecreatedPosition: (fen: string) => void;
  /** Score of the last submitted problem; set during `problem-result`. */
  currentAccuracy: PositionAccuracy | null;
  problemResults: ReadonlyMap<number, PositionAccuracy>;
  recreatedPositions: ReadonlyMap<number, string>;
  skippedProblems: ReadonlySet<number>;
  /** Score the current board against the problem and show the result. */
  submit: () => void;
  /**
   * Mark the current problem skipped and move on; ends the session after the
   * last one. Returns true when it moved to another problem, so the caller
   * can reset per-problem UI (the web scrolls back to the board).
   */
  skip: () => boolean;
  /** Leave `problem-result` for the next problem on an empty board. */
  nextProblem: () => void;
  /** End the session now (view results, or quit confirmed). */
  finish: () => void;
};

/**
 * State of a FEN reconstruction session: which problem is up, the player's
 * board, and the per-problem scores. Navigation, persistence and the result
 * hand-off stay with the app; {@link summarizeFenSession} turns the maps this
 * returns into the result payload.
 */
export function useFenPracticeSession({
  positions: initialPositions,
  pieceNames,
  accuracyDescriptions,
}: UseFenPracticeSessionConfig): UseFenPracticeSessionReturn {
  // Fixed for the session's lifetime: a shuffled list re-shuffled on a later
  // render would move the player to a different problem mid-session.
  const [positions] = useState(initialPositions);
  const [phase, setPhase] = useState<FenSessionPhase>("recreate");
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [recreatedPosition, setRecreatedPosition] = useState(EMPTY_BOARD_FEN);
  const [currentAccuracy, setCurrentAccuracy] =
    useState<PositionAccuracy | null>(null);
  const [problemResults, setProblemResults] = useState<
    Map<number, PositionAccuracy>
  >(() => new Map());
  const [recreatedPositions, setRecreatedPositions] = useState<
    Map<number, string>
  >(() => new Map());
  const [skippedProblems, setSkippedProblems] = useState<Set<number>>(
    () => new Set(),
  );

  const originalPosition = useMemo<FenPosition | null>(
    () => positions[currentProblemIndex] || null,
    [positions, currentProblemIndex],
  );

  const submit = useCallback(() => {
    if (!originalPosition) return;

    const accuracy = calculateAccuracy(
      originalPosition.fen,
      recreatedPosition,
      pieceNames,
      accuracyDescriptions,
    );

    setCurrentAccuracy(accuracy);
    setProblemResults((prev) =>
      new Map(prev).set(currentProblemIndex, accuracy),
    );
    setRecreatedPositions((prev) =>
      new Map(prev).set(currentProblemIndex, recreatedPosition),
    );
    setPhase("problem-result");
  }, [
    originalPosition,
    recreatedPosition,
    currentProblemIndex,
    pieceNames,
    accuracyDescriptions,
  ]);

  const goToProblem = useCallback((index: number) => {
    setCurrentProblemIndex(index);
    setRecreatedPosition(EMPTY_BOARD_FEN);
    setCurrentAccuracy(null);
    setPhase("recreate");
  }, []);

  const skip = useCallback(() => {
    setSkippedProblems((prev) => new Set(prev).add(currentProblemIndex));

    const nextIndex = currentProblemIndex + 1;
    if (nextIndex < positions.length) {
      goToProblem(nextIndex);
      return true;
    }
    setPhase("result");
    return false;
  }, [currentProblemIndex, positions, goToProblem]);

  const nextProblem = useCallback(() => {
    goToProblem(currentProblemIndex + 1);
  }, [currentProblemIndex, goToProblem]);

  const finish = useCallback(() => {
    setPhase("result");
  }, []);

  return {
    positions,
    phase,
    currentProblemIndex,
    originalPosition,
    recreatedPosition,
    setRecreatedPosition,
    currentAccuracy,
    problemResults,
    recreatedPositions,
    skippedProblems,
    submit,
    skip,
    nextProblem,
    finish,
  };
}

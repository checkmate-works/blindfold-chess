import { writeSessionItem } from '@/lib/storage/session-storage';

import type { Attempt } from './puzzle-match';

export type PuzzleResultPayload = {
  /** Full attempt history (correct and incorrect submits). */
  attempts: Attempt[];
  /** Space-separated SAN of the solution line to display on the result page. */
  solutionLine: string;
  /** Starting FEN of the puzzle, so the result page can render the position. */
  fen: string;
  /** Number of times the user peeked at the board during the run. */
  peekCount: number;
};

/** sessionStorage key under which a puzzle's result payload is stashed. */
export function puzzleResultStorageKey(positionId: string): string {
  return `puzzle_result_${positionId}`;
}

/**
 * Persist a puzzle result payload to sessionStorage for the `/result` page to
 * read back without a fresh DB fetch. Storage failures (private mode, quota)
 * are swallowed: a missing payload only degrades the result page, it must
 * never break the navigation that follows.
 *
 * Shared by the solved-puzzle handshake (`usePuzzleCompletion`) and the
 * "view result" link on an unsolved-but-attempted run, which write the same
 * payload shape under the same key.
 */
export function writePuzzleResult(positionId: string, payload: PuzzleResultPayload): void {
  writeSessionItem(puzzleResultStorageKey(positionId), JSON.stringify(payload));
}

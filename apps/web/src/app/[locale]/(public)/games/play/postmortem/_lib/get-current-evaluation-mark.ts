import type { EvaluationMark } from '@/lib/evaluation';

import type { MoveLogEntry } from './evaluation-helpers';

/**
 * Determine the evaluation mark for the currently displayed board position.
 *
 * Walks the move log (skipping incorrect entries) to find the evaluation
 * that corresponds to the given move index, then pairs it with the
 * destination square from `lastMove`.
 */
export function getCurrentEvaluationMark(
  currentPosition: number,
  userMovesLength: number,
  currentLastMove: { from: string; to: string } | null,
  moveLog: MoveLogEntry[]
): EvaluationMark | null {
  if (!currentLastMove) return null;

  const moveIndex =
    currentPosition === -1 ? userMovesLength - 1 : currentPosition === -2 ? -1 : currentPosition;

  if (moveIndex < 0) return null;

  let actualMoveCount = 0;
  for (const entry of moveLog) {
    if (entry.status !== 'incorrect') {
      if (actualMoveCount === moveIndex && entry.evaluation) {
        return {
          square: currentLastMove.to,
          loss: entry.evaluation.loss,
          isMate: entry.evaluation.mate !== undefined,
        };
      }
      actualMoveCount++;
    }
  }

  return null;
}

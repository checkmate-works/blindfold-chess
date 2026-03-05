import type { MoveLogEntry } from './evaluation-helpers';

/**
 * Build the `previousEval` object from the last entry in the move log.
 *
 * Returns `undefined` when there is no usable evaluation in the log.
 * This eliminates the duplicated construction pattern across all three
 * handlers in usePostmortemActions.
 */
export function buildPreviousEval(
  moveLog: MoveLogEntry[]
): { score: number; mate?: number; bestMove?: string } | undefined {
  if (moveLog.length === 0) return undefined;

  const lastEval = moveLog[moveLog.length - 1].evaluation;
  if (!lastEval) return undefined;

  return {
    score: lastEval.score,
    mate: lastEval.mate,
    bestMove: lastEval.nextBestMove,
  };
}

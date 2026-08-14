import { getLegalMoves, isCheckmateFen, replayMoves } from '@blindfold-chess/features/chess-core';
import type { Fen } from '@blindfold-chess/types';

import type { PositionEvaluation } from './types';
import { EVAL_SCORE_LIMIT } from './types';

/**
 * Search depth for the per-position review sweep. Depth 12 grades
 * mistakes/blunders reliably while keeping a 40-move game inside roughly a
 * minute of browser CPU; the engine default (15) doubles-to-triples that for
 * marginal precision the coach prose doesn't need.
 */
export const ANALYSIS_DEPTH = 12;

/**
 * Hard ceiling on reviewable game length, in plies. Beyond this the serial
 * browser sweep takes long enough to be hostile UX (and the SAN line stops
 * fitting a sane LLM input), so the CTA refuses upfront instead of stalling.
 */
export const MAX_ANALYSIS_PLIES = 200;

/**
 * The slice of `ChessEngine` this module needs — injected so tests can feed
 * scripted evaluations without a Worker, and so the caller owns the engine
 * lifecycle (create for the sweep, destroy after; never share the instance a
 * live game is using, the engine is single-request).
 */
export type PositionEvaluator = {
  getEvaluation(
    fen: Fen,
    depth?: number
  ): Promise<{ score: number; mate?: number; bestMove?: string }>;
};

export type EvaluatePositionsOptions = {
  moves: string[];
  startingFen?: string;
  evaluator: PositionEvaluator;
  /** Called after each position completes, for the progress bar. */
  onProgress?: (done: number, total: number) => void;
  /** Abort between positions (the in-flight probe still runs to completion). */
  signal?: AbortSignal;
};

/**
 * Run the engine over every position of a finished game, producing the
 * `moves.length + 1` {@link PositionEvaluation}s the server derives verdicts
 * from (see `derive-move-analyses.ts`).
 *
 * Terminal positions are special-cased WITHOUT consulting the engine:
 * Stockfish answers `go` on a mated/stalemated position with
 * `bestmove (none)`, which the UCI transport does not parse — the request
 * would hang into its 20s timeout. Only the final position can be terminal
 * in a finished game, but the check is applied per position for robustness.
 */
export async function evaluatePositions({
  moves,
  startingFen,
  evaluator,
  onProgress,
  signal,
}: EvaluatePositionsOptions): Promise<PositionEvaluation[]> {
  if (moves.length > MAX_ANALYSIS_PLIES) {
    throw new Error(`game exceeds ${MAX_ANALYSIS_PLIES} plies`);
  }

  const positions = replayMoves(moves, startingFen);
  if (positions.length !== moves.length + 1) {
    throw new Error('moves failed to replay');
  }

  const total = positions.length;
  const evaluations: PositionEvaluation[] = [];

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      throw new DOMException('analysis aborted', 'AbortError');
    }

    const fen = positions[i].fen;
    const terminal = resolveTerminalEvaluation(fen);
    if (terminal) {
      evaluations.push(terminal);
    } else {
      const result = await evaluator.getEvaluation(fen, ANALYSIS_DEPTH);
      evaluations.push({
        score: result.score,
        ...(result.mate !== undefined ? { mate: result.mate } : {}),
        ...(result.bestMove ? { bestMoveUci: result.bestMove } : {}),
      });
    }
    onProgress?.(i + 1, total);
  }

  return evaluations;
}

/**
 * Evaluation of a game-over position, or null when play can continue.
 * Checkmate scores as a win for the side that delivered it (the side NOT to
 * move), saturated like the engine's own mate scores; stalemate is a dead 0.
 */
function resolveTerminalEvaluation(fen: string): PositionEvaluation | null {
  if (isCheckmateFen(fen)) {
    const whiteMated = fen.split(' ')[1] === 'w';
    return { score: whiteMated ? -EVAL_SCORE_LIMIT : EVAL_SCORE_LIMIT };
  }
  if (getLegalMoves(fen).length === 0) {
    return { score: 0 };
  }
  return null;
}

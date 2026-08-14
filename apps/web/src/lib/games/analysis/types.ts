/**
 * Post-game engine analysis — domain types.
 *
 * The analysis pipeline is deliberately split across the trust boundary:
 *
 *  1. The BROWSER runs Stockfish (the only place the WASM engine exists) and
 *     produces one {@link PositionEvaluation} per position — raw numbers only.
 *  2. The SERVER re-derives everything judgeable ({@link MoveAnalysis}: cp
 *     loss, judgment, best-move SAN) from those numbers plus the trusted
 *     `games.moves` snapshot, via the pure `deriveMoveAnalyses`.
 *
 * The client is treated as an *engine oracle*, not as an analyst: it can lie
 * about scores (same self-reported model as `operation_logs` — the only
 * victim is the review of the submitter's own game), but it cannot make the
 * server mis-derive a judgment from a given score, and it cannot inject SAN
 * or prose anywhere.
 */
import type { Side } from '@blindfold-chess/types';

/**
 * One engine probe of one position, in the shape the browser ships to the
 * server. `score`/`mate` are white-perspective (see
 * `toWhitePerspectiveEvaluation` in `@blindfold-chess/features/ai-game`);
 * mates arrive score-saturated at ±{@link EVAL_SCORE_LIMIT}.
 */
export type PositionEvaluation = {
  /** Centipawns from white's perspective, clamped to ±{@link EVAL_SCORE_LIMIT}. */
  score: number;
  /** Mate-in-N (white-perspective sign), when the engine reported one. */
  mate?: number;
  /** Engine's preferred move in this position, UCI (e.g. "e2e4", "e7e8q"). */
  bestMoveUci?: string;
};

/** The saturation value `EvaluationAccumulator` substitutes for mate scores. */
export const EVAL_SCORE_LIMIT = 10000;

/** Move grades, ordered best → worst. Thresholds: `EVALUATION_LOSS_THRESHOLDS`. */
export const MOVE_JUDGMENTS = ['best', 'good', 'inaccuracy', 'mistake', 'blunder'] as const;
export type MoveJudgment = (typeof MOVE_JUDGMENTS)[number];

/**
 * A fully derived verdict on one played move — the server-side product of
 * {@link PositionEvaluation}s and the game record. Everything here except the
 * two eval numbers is recomputed on the server and safe to persist/display.
 */
export type MoveAnalysis = {
  /** 0-based index into `games.moves[]`. */
  ply: number;
  /** The move as played (SAN, from the trusted game record). */
  san: string;
  /** Fullmove number shown next to the SAN (e.g. 18 for "18. Nd5"). */
  moveNumber: number;
  /** Which side played this move. */
  color: Side;
  /** Evaluation before the move, centipawns, white perspective. */
  evalBefore: number;
  /** Evaluation after the move, centipawns, white perspective. */
  evalAfter: number;
  /** Centipawns thrown away by the mover (≥ 0). */
  cpLoss: number;
  /** Stockfish's preferred move in the pre-move position (SAN), or null. */
  bestMoveSan: string | null;
  judgment: MoveJudgment;
};

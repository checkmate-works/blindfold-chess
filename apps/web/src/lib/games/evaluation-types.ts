import type { MoveJudgment } from './analysis/types';

/**
 * A move grade pinned to the square the move landed on, for the board to draw
 * (see `MoveJudgmentBadge`). Grade-keyed rather than centipawn-keyed: every
 * producer already holds a classified {@link MoveJudgment} (the AI review's
 * moments), and classifying twice is how two surfaces start disagreeing.
 */
export type EvaluationMark = {
  square: string;
  judgment: MoveJudgment;
};

/**
 * Centipawn-loss thresholds behind every move grade in the app. `classifyMove`
 * is the only reader — a caller with a raw loss goes through it rather than
 * re-deriving the ladder here. A loss at or below a bound earns that grade;
 * anything above `mistake` is a blunder.
 */
export const EVALUATION_LOSS_THRESHOLDS = {
  /** ≤ this: the move matches the engine choice for practical purposes. */
  best: 20,
  /** ≤ this: solid move, no comment needed. */
  good: 50,
  /** ≤ this: dubious (?!). */
  inaccuracy: 100,
  /** ≤ this: mistake (?); above: blunder (??). */
  mistake: 300,
} as const;

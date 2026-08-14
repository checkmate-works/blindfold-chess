export type EvaluationMark = {
  square: string;
  loss: number;
  isMate?: boolean;
};

/**
 * Centipawn-loss thresholds shared by every surface that grades a move
 * (the board badge in `getEvaluationIcon` and the AI-review classifier in
 * `@/lib/games/analysis/classify-move`). A loss at or below a bound earns
 * that grade; anything above `mistake` is a blunder. Single-sourced here so
 * the badge a player sees and the judgment the AI coach reasons about can
 * never disagree.
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

// Module-specific Exp weights
export const MODULE_WEIGHT: Record<string, number> = {
  coordinate_quiz: 1,
  square_colors: 1,
  diagonal_quiz: 15,
  legal_moves: 1.5,
  board_symmetry: 2.5,
  route_planner: 15,
};

// Default weight (applied for unknown menuType)
export const DEFAULT_MODULE_WEIGHT = 1;

/**
 * Accuracy bonus based on number of incorrect answers.
 * Challenges end after 3 misses (burst), so incorrectAnswers is always 0–3.
 */
export const MISS_BONUS: { misses: number; multiplier: number }[] = [
  { misses: 0, multiplier: 1.5 }, // Perfect — no mistakes
  { misses: 1, multiplier: 1.2 },
  { misses: 2, multiplier: 1.1 },
  // 3 misses (burst) = no bonus (1.0)
];

// ストリーク（同日チャレンジ連続回数）ボーナス
export const STREAK_THRESHOLDS = [
  { min: 5, multiplier: 1.3 },
  { min: 3, multiplier: 1.2 },
  { min: 2, multiplier: 1.1 },
] as const;

// レベルカーブ: requiredExp(level) = floor(BASE * level^EXPONENT)
export const EXP_CURVE = { base: 100, exponent: 1.5 } as const;

// チャレンジ完了の最低保証Exp
export const MIN_COMPLETION_EXP = 1;

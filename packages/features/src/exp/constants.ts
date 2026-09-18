// Module-specific Exp weights
export const MODULE_WEIGHT: Record<string, number> = {
  coordinate_quiz: 1,
  square_colors: 1,
  diagonal_quiz: 15,
  legal_moves: 1.5,
  board_symmetry: 2.5,
  route_planner: 15,
  position_memory: 5,
  puzzle: 12,
};

// Default weight (applied for unknown menuType)
export const DEFAULT_MODULE_WEIGHT = 1;

/**
 * Returns the Exp weight for the given practice menu type.
 * Falls back to {@link DEFAULT_MODULE_WEIGHT} for unknown menu types.
 */
export function getModuleWeight(menuType: string): number {
  return MODULE_WEIGHT[menuType] ?? DEFAULT_MODULE_WEIGHT;
}

/**
 * Accuracy bonus based on number of incorrect answers.
 * Challenges end after 3 misses (burst), so incorrectAnswers is always 0–3.
 *
 * Entries must stay sorted by ascending `misses`: the lookup walks the ladder
 * in order and takes the first rung whose `misses` the player has not exceeded.
 * Miss counts above the last rung get {@link NO_ACCURACY_BONUS_MULTIPLIER}
 * instead of an entry of their own.
 */
export const MISS_BONUS: { misses: number; multiplier: number }[] = [
  { misses: 0, multiplier: 1.5 }, // Perfect — no mistakes
  { misses: 1, multiplier: 1.2 },
  { misses: 2, multiplier: 1.1 },
];

/**
 * Multiplier for miss counts past the last rung of {@link MISS_BONUS} — today
 * that is the 3-miss burst. Exp is left untouched rather than penalised, so
 * this is exactly 1, and it is named here (rather than inlined at the lookup)
 * because the FAQ renders the same fall-through as the bottom row of its
 * accuracy-bonus table.
 */
export const NO_ACCURACY_BONUS_MULTIPLIER = 1.0;

// レベルカーブ: requiredExp(level) = floor(BASE * level^EXPONENT)
export const EXP_CURVE = { base: 100, exponent: 1.5 } as const;

// チャレンジ完了の最低保証Exp
export const MIN_COMPLETION_EXP = 1;

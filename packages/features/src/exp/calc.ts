/**
 * Exp Calculation (経験値計算)
 *
 * @description
 * Core calculation logic for experience points earned from challenge completions.
 *
 * @see {@link ./constants.ts} for module weights and accuracy thresholds
 * @see {@link ./types.ts} for ExpInput / ExpResult type definitions
 * @see {@link ./level.ts} for level curve and progression logic
 * @see {@link ../../../apps/web/src/lib/db/save-exp.ts} for database persistence (grantChallengeExp)
 */
import {
  DEFAULT_MODULE_WEIGHT,
  MIN_COMPLETION_EXP,
  MISS_BONUS,
  MODULE_WEIGHT,
} from "./constants";
import type { ExpInput, ExpResult } from "./types";

function getAccuracyMultiplier(incorrectAnswers: number): number {
  for (const { misses, multiplier } of MISS_BONUS) {
    if (incorrectAnswers <= misses) {
      return multiplier;
    }
  }
  return 1.0;
}

export function calculateExp(input: ExpInput): ExpResult {
  const { score, incorrectAnswers, menuType } = input;

  const weight = MODULE_WEIGHT[menuType] ?? DEFAULT_MODULE_WEIGHT;
  const baseExp = score * weight;

  const accuracyMultiplier = getAccuracyMultiplier(incorrectAnswers);

  const totalExp = Math.max(
    MIN_COMPLETION_EXP,
    Math.floor(baseExp * accuracyMultiplier),
  );

  return {
    baseExp,
    accuracyMultiplier,
    totalExp,
  };
}

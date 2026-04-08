/**
 * Exp Calculation (経験値計算)
 *
 * @description
 * Core calculation logic for experience points earned from challenge completions.
 *
 * @see {@link ./constants.ts} for module weights, accuracy thresholds, and streak thresholds
 * @see {@link ./types.ts} for ExpInput / ExpResult type definitions
 * @see {@link ./level.ts} for level curve and progression logic
 * @see {@link ../../../apps/web/src/lib/db/save-exp.ts} for database persistence and daily streak counting (grantChallengeExp)
 */
import {
  DEFAULT_MODULE_WEIGHT,
  MIN_COMPLETION_EXP,
  MISS_BONUS,
  MODULE_WEIGHT,
  STREAK_THRESHOLDS,
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

function getStreakMultiplier(dailyChallengeCount: number): number {
  // dailyChallengeCountは「このチャレンジを含まない」完了数なので、
  // streak = dailyChallengeCount + 1 相当
  const streak = dailyChallengeCount + 1;
  for (const { min, multiplier } of STREAK_THRESHOLDS) {
    if (streak >= min) {
      return multiplier;
    }
  }
  return 1.0;
}

export function calculateExp(input: ExpInput): ExpResult {
  const { score, incorrectAnswers, menuType, dailyChallengeCount } = input;

  const weight = MODULE_WEIGHT[menuType] ?? DEFAULT_MODULE_WEIGHT;
  const baseExp = score * weight;

  const accuracyMultiplier = getAccuracyMultiplier(incorrectAnswers);
  const streakMultiplier = getStreakMultiplier(dailyChallengeCount);

  const totalExp = Math.max(
    MIN_COMPLETION_EXP,
    Math.floor(baseExp * accuracyMultiplier * streakMultiplier),
  );

  return {
    baseExp,
    accuracyMultiplier,
    streakMultiplier,
    totalExp,
  };
}

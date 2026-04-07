import {
  ACCURACY_THRESHOLDS,
  DEFAULT_MODULE_WEIGHT,
  MIN_COMPLETION_EXP,
  MODULE_WEIGHT,
  STREAK_THRESHOLDS,
} from "./constants";
import type { ExpInput, ExpResult } from "./types";

function getAccuracyMultiplier(accuracy: number): number {
  for (const { min, multiplier } of ACCURACY_THRESHOLDS) {
    if (accuracy >= min) {
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
  const { score, totalQuestions, menuType, dailyChallengeCount } = input;

  const weight = MODULE_WEIGHT[menuType] ?? DEFAULT_MODULE_WEIGHT;
  const baseExp = score * weight;

  const accuracy = totalQuestions > 0 ? score / totalQuestions : 0;
  const accuracyMultiplier = getAccuracyMultiplier(accuracy);
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

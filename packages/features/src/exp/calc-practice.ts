/**
 * Exp Calculation for Practice (Free-Play) Results
 *
 * @description
 * Pure calculation logic for experience points earned from free-play practice
 * result grants (non-challenge flows). Unlike challenge sessions — which burst
 * after 3 misses so `incorrectAnswers` is bounded to 0–3 — free-play sessions
 * can record arbitrary miss counts, so this calculator uses a wider bonus
 * ladder keyed on the number of mistakes.
 *
 * @see {@link ./calc.ts} for the challenge-mode calculator (calculateExp)
 * @see {@link ./constants.ts} for MODULE_WEIGHT / getModuleWeight
 * @see {@link ../../../apps/web/src/lib/db/save-exp.ts} for the database
 *      persistence wrapper `grantPracticeExp`
 */
import { MIN_COMPLETION_EXP } from "./constants";

export type PracticeExpInput = {
  /** Number of correctly-recalled units in the practice run. */
  correctCount: number;
  /** Number of mistakes committed during the practice run. */
  mistakes: number;
  /** Module weight resolved via getModuleWeight(menuType). */
  weight: number;
};

export type PracticeExpResult = {
  baseExp: number;
  accuracyMultiplier: number;
  totalExp: number;
};

/**
 * Returns the practice-mode accuracy multiplier for a given mistake count.
 *
 * Ladder:
 * - 0 mistakes → ×1.5 (perfect)
 * - ≤3 mistakes → ×1.2
 * - ≤5 mistakes → ×1.1
 * - else → ×1.0
 */
export function getPracticeAccuracyMultiplier(mistakes: number): number {
  if (mistakes <= 0) return 1.5;
  if (mistakes <= 3) return 1.2;
  if (mistakes <= 5) return 1.1;
  return 1.0;
}

/**
 * Pure calculator for free-play practice Exp grants.
 *
 * Formula: `floor(correctCount * weight * accuracyMultiplier)`, clamped to at
 * least {@link MIN_COMPLETION_EXP} only when `correctCount > 0` — a run with
 * zero correct answers (e.g., a skipped problem) earns zero Exp and should
 * not be persisted by the caller.
 */
export function calculatePracticeExp(
  input: PracticeExpInput,
): PracticeExpResult {
  const { correctCount, mistakes, weight } = input;

  const baseExp = correctCount * weight;
  const accuracyMultiplier = getPracticeAccuracyMultiplier(mistakes);

  const raw = Math.floor(baseExp * accuracyMultiplier);
  const totalExp = correctCount > 0 ? Math.max(MIN_COMPLETION_EXP, raw) : 0;

  return {
    baseExp,
    accuracyMultiplier,
    totalExp,
  };
}

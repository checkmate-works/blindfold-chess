import { getLevel, getLevelProgress } from "./level";
import type { ExpInfo } from "./types";

/**
 * The grant outcome `buildExpInfo` summarizes: the user's post-grant total,
 * plus — on the idempotent replay path — the originally-granted amount.
 */
export type ExpGrantOutcome =
  | { totalExp: number; alreadyGranted: false }
  | { totalExp: number; alreadyGranted: true; existingAmount: number };

/**
 * Build the `ExpInfo` view returned to callers from a grant outcome and the
 * amount granted on THIS call.
 *
 * The fresh-grant and idempotent-replay paths share every derivation, and
 * differ only in how `earnedExp` is computed. On the idempotent replay path
 * the originally-granted amount is surfaced and `levelUp` is forced to
 * `false` (the transition, if any, happened on the first call); on a fresh
 * grant the before/after level comparison decides `levelUp`.
 */
export function buildExpInfo(
  grantResult: ExpGrantOutcome,
  grantedAmount: number,
): ExpInfo {
  const { totalExp } = grantResult;
  const levelAfter = getLevel(totalExp);
  const progressPercent = Math.round(getLevelProgress(totalExp).progress * 100);

  if (grantResult.alreadyGranted) {
    return {
      earnedExp: grantResult.existingAmount,
      totalExp,
      level: levelAfter,
      levelUp: false,
      progressPercent,
    };
  }

  const levelBefore = getLevel(totalExp - grantedAmount);
  return {
    earnedExp: grantedAmount,
    totalExp,
    level: levelAfter,
    levelUp: levelAfter > levelBefore,
    progressPercent,
  };
}

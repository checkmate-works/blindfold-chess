/**
 * Correct/incorrect flash-policy timing used by quiz-style practice modules
 * that dwell on an incorrect answer longer than a correct one (so the user
 * has a moment to read the correct solution before advancing).
 *
 * Distinct from `FEEDBACK_SPEED_MS` in `./feedback-speed`, which is a
 * user-selected UNIFORM duration per answer. This policy is fixed: 1000ms
 * on correct, 2000ms on incorrect.
 */
export const FEEDBACK_FLASH_MS = {
  correct: 1000,
  incorrect: 2000,
} as const;

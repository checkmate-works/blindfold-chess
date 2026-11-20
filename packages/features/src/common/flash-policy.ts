/**
 * Feedback flash of a timed session that does not choose its own: the same
 * 500ms after a correct and an incorrect answer.
 *
 * `useTimedSession` falls back to it when no `feedbackDuration` is given, and
 * the server-side challenge definitions of the modules that rely on that
 * fallback return it from `feedbackMs`. Both read this one constant because
 * the server restarts its clock this long after an answer: if the two values
 * drifted apart, the on-screen clock and the server's would disagree by the
 * difference on every answer.
 */
export const DEFAULT_FEEDBACK_MS = 500;

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

/**
 * `feedbackDuration` selector for `useTimedSession` implementing the flash
 * policy above — pass it as-is instead of re-authoring the ternary inline.
 */
export const flashFeedbackDuration = (correct: boolean): number =>
  correct ? FEEDBACK_FLASH_MS.correct : FEEDBACK_FLASH_MS.incorrect;

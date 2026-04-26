/**
 * User-selected feedback speed for quiz-style practice modules where the
 * feedback flash duration is uniform per answer (same for correct and
 * incorrect). Distinct from the correct/incorrect flash-policy constants
 * in `./flash-policy`, which encode a fixed two-duration policy.
 */
export const FEEDBACK_SPEEDS = ["fast", "normal", "slow"] as const;
export type FeedbackSpeed = (typeof FEEDBACK_SPEEDS)[number];

export const FEEDBACK_SPEED_MS: Record<FeedbackSpeed, number> = {
  fast: 300,
  normal: 600,
  slow: 900,
};

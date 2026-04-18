/**
 * Mistake limit for challenge mode (shared across all menus).
 *
 * This value is shared by every challenge module (coordinate_quiz, legal_moves,
 * square_colors). The session ends once the mistake count reaches this number.
 *
 * A single value is used for all menus today. If per-menu limits become
 * necessary in the future, this should be migrated to a per-menu config table
 * or mapping. The following call sites would be affected by such a change:
 * - the `useTimedSession` call in each challenge component
 * - the completion detection logic on the dashboard (dashboard-utils.ts)
 * - the leaderboard display logic
 */
export const MISTAKE_LIMIT = 3;

/**
 * Time limit for challenge mode in seconds (shared across all menus).
 *
 * Challenges are always fixed to 60 seconds. Exposing this as a tunable
 * URL parameter is not acceptable — neither from a security standpoint nor
 * from a business-logic standpoint.
 */
export const CHALLENGE_TIME_LIMIT = 60;

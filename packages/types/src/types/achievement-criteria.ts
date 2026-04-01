/**
 * Achievement Criteria — discriminated union types for achievement judgment conditions.
 *
 * Each achievement category has a distinct criteria schema stored as JSONB in the
 * `achievements.criteria` column. These types provide compile-time safety when
 * reading/writing criteria values at the application layer.
 *
 * The `category` discriminator field matches the `achievements.category` column value,
 * enabling exhaustive pattern matching via TypeScript's narrowing.
 */

/** Monthly leaderboard placement (e.g., "1st place in coordinate_quiz white for January 2026"). */
type MonthlyLeaderboardCriteria = {
  category: "monthly_leaderboard";
  menuType: string;
  leaderboardKey: string;
  placement: 1 | 2 | 3;
};

/** Cumulative action count (e.g., "complete 100 challenges"). */
type CumulativeCriteria = {
  category: "cumulative";
  action: string;
  threshold: number;
};

/** Consecutive-day streak (e.g., "practice 7 days in a row"). */
type StreakCriteria = {
  category: "streak";
  action: string;
  days: number;
};

/** One-time condition (e.g., "achieve a perfect score"). */
type OneShotCriteria = {
  category: "one_shot";
  condition: string;
  menuType?: string;
  leaderboardKey?: string;
};

/** Social metric threshold (e.g., "receive 50 likes"). */
type SocialCriteria = {
  category: "social";
  metric: string;
  threshold: number;
};

/** AI engine defeat (e.g., "beat Stockfish at level 5"). */
type AiDefeatCriteria = {
  category: "ai_defeat";
  engine: string;
  minLevel: number;
};

export type AchievementCriteria =
  | MonthlyLeaderboardCriteria
  | CumulativeCriteria
  | StreakCriteria
  | OneShotCriteria
  | SocialCriteria
  | AiDefeatCriteria;

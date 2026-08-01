import { asc, count, desc, eq, sql } from 'drizzle-orm';

import { db } from './index';
import { achievements, userAchievements } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One badge *definition* a user holds, with every grant of it folded together.
 *
 * Repeatable badges (`achievements.repeatable` — currently every
 * `monthly_leaderboard` entry) produce one `user_achievements` row per month,
 * so a regular top-3 finisher accumulates rows without bound. Grouping by
 * definition caps the rendered list at the number of seeded definitions
 * (42 as of writing: 14 leaderboards x 3 placements) no matter how long the
 * user keeps placing.
 */
export type UserAchievementGroup = {
  slug: string;
  category: string;
  iconKey: string;
  /** Number of grants folded into this group; 1 for non-repeatable badges. */
  timesEarned: number;
  /** Per-grant `user_achievements.metadata`, newest grant first. */
  occurrences: unknown[];
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch a user's achievements folded to one entry per badge definition,
 * most recently earned definition first.
 *
 * `GROUP BY achievements.id` alone is valid here: it is that table's primary
 * key, so Postgres treats the other selected `achievements` columns as
 * functionally dependent on it.
 */
export async function getUserAchievementGroups(userId: string): Promise<UserAchievementGroup[]> {
  return db
    .select({
      slug: achievements.slug,
      category: achievements.category,
      iconKey: achievements.iconKey,
      timesEarned: count(),
      occurrences: sql<
        unknown[]
      >`jsonb_agg(${userAchievements.metadata} ORDER BY ${userAchievements.achievedAt} DESC)`,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .groupBy(achievements.id)
    .orderBy(desc(sql`max(${userAchievements.achievedAt})`), asc(achievements.displayOrder));
}

/**
 * Total badges earned across all groups — the headline figure next to the
 * section title. Deliberately a grant count, not a definition count, so that
 * winning the same badge again still moves the number.
 */
export function countTotalEarned(groups: UserAchievementGroup[]): number {
  return groups.reduce((total, group) => total + group.timesEarned, 0);
}

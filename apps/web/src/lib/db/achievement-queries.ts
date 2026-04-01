import { count, desc, eq } from 'drizzle-orm';

import { db } from './index';
import { achievements, userAchievements } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserAchievementRow = {
  slug: string;
  category: string;
  iconKey: string;
  metadata: unknown;
  achievedAt: Date;
};

// ---------------------------------------------------------------------------
// Base query builder
// ---------------------------------------------------------------------------

/**
 * Builds the base query for fetching user achievements.
 * Selects slug, category, iconKey, metadata, achievedAt and joins with achievements table.
 * Sorted by achievedAt DESC.
 */
function baseUserAchievementsQuery(userId: string) {
  return db
    .select({
      slug: achievements.slug,
      category: achievements.category,
      iconKey: achievements.iconKey,
      metadata: userAchievements.metadata,
      achievedAt: userAchievements.achievedAt,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.achievedAt));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch all achievements for a user (profile page). Sorted by achievedAt DESC. */
export async function getUserAchievements(userId: string): Promise<UserAchievementRow[]> {
  return baseUserAchievementsQuery(userId);
}

/** Fetch achievements for a user with pagination. Sorted by achievedAt DESC. */
export async function getUserAchievementsPaginated(
  userId: string,
  options: { limit: number; offset: number }
): Promise<UserAchievementRow[]> {
  return baseUserAchievementsQuery(userId).limit(options.limit).offset(options.offset);
}

/** Count achievements for a user (profile summary). */
export async function getUserAchievementCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  return row?.count ?? 0;
}

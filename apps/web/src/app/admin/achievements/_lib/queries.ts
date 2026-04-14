import { asc, desc, eq, sql } from 'drizzle-orm';

import { achievements, db, profiles, userAchievements } from '@/lib/db';

export type AchievementWithHolderCount = {
  id: string;
  slug: string;
  category: string;
  iconKey: string;
  displayOrder: number;
  repeatable: boolean;
  createdAt: Date;
  holderCount: number;
};

/**
 * List achievements with the count of associated user_achievements rows.
 * Sorted by (displayOrder ASC, slug ASC) to match the public ordering.
 */
export async function listAchievementsWithHolderCount({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}): Promise<AchievementWithHolderCount[]> {
  const rows = await db
    .select({
      id: achievements.id,
      slug: achievements.slug,
      category: achievements.category,
      iconKey: achievements.iconKey,
      displayOrder: achievements.displayOrder,
      repeatable: achievements.repeatable,
      createdAt: achievements.createdAt,
      holderCount: sql<number>`count(${userAchievements.id})::int`,
    })
    .from(achievements)
    .leftJoin(userAchievements, eq(userAchievements.achievementId, achievements.id))
    .groupBy(achievements.id)
    .orderBy(asc(achievements.displayOrder), asc(achievements.slug))
    .limit(limit)
    .offset(offset);

  return rows;
}

/** Total number of rows in the achievements master table. */
export async function countAchievements(): Promise<number> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(achievements);
  return row?.count ?? 0;
}

/** Fetch a single achievement by id (for the detail page header). */
export async function getAchievementById(id: string) {
  const [row] = await db.select().from(achievements).where(eq(achievements.id, id)).limit(1);
  return row ?? null;
}

export type AchievementHolder = {
  id: string;
  userId: string;
  achievedAt: Date;
  metadata: unknown;
  username: string | null;
};

/**
 * List holders (user_achievements rows) for a given achievement, joined with
 * profiles for username display. Sorted by achievedAt DESC.
 *
 * Note: repeatable achievements produce multiple rows per user — this is
 * intentional and not deduped.
 */
export async function listAchievementHolders(
  achievementId: string,
  { limit, offset }: { limit: number; offset: number }
): Promise<AchievementHolder[]> {
  const rows = await db
    .select({
      id: userAchievements.id,
      userId: userAchievements.userId,
      achievedAt: userAchievements.achievedAt,
      metadata: userAchievements.metadata,
      username: profiles.username,
    })
    .from(userAchievements)
    .leftJoin(profiles, eq(profiles.id, userAchievements.userId))
    .where(eq(userAchievements.achievementId, achievementId))
    .orderBy(desc(userAchievements.achievedAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

/** Count holders (including duplicates for repeatable achievements). */
export async function countAchievementHolders(achievementId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userAchievements)
    .where(eq(userAchievements.achievementId, achievementId));
  return row?.count ?? 0;
}

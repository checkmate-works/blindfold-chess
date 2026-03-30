import { asc, eq } from 'drizzle-orm';

import { db, ranks, userRanks } from '@/lib/db';

export async function getAllRanks() {
  return db.select().from(ranks).orderBy(asc(ranks.level));
}

export async function getRankBySlug(slug: string) {
  const rows = await db.select().from(ranks).where(eq(ranks.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getUserAchievedRankIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ rankId: userRanks.rankId })
    .from(userRanks)
    .where(eq(userRanks.userId, userId));
  return new Set(rows.map((r) => r.rankId));
}

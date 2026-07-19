import { asc, eq } from 'drizzle-orm';

import { db, ranks, userRanks } from '@/lib/db';
import { ALL_RANK_SLUGS, parseRequirements } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { resolveAchievedSlugs } from './helpers';

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

/**
 * Fetch all ranks + a user's achieved rank ids in parallel and resolve them
 * to a typed achieved-slugs set. Shared by the two Server Actions that need
 * a user's LITERAL (non-display) achieved slugs.
 *
 * Not used by dojo/page.tsx: dojo also needs `dbRanks` itself for
 * `resolveNextRank`, so going through this wrapper there would mean fetching
 * `getAllRanks()` twice.
 */
export async function getAchievedSlugsForUser(userId: string): Promise<ReadonlySet<RankSlug>> {
  const [dbRanks, achievedRankIds] = await Promise.all([
    getAllRanks(),
    getUserAchievedRankIds(userId),
  ]);
  return resolveAchievedSlugs(dbRanks, achievedRankIds);
}

export async function getValidatedRank(slug: string) {
  if (!(ALL_RANK_SLUGS as readonly string[]).includes(slug)) return null;
  const rankSlug = slug as RankSlug;
  const rank = await getRankBySlug(rankSlug);
  if (!rank) return null;
  const requirements = parseRequirements(rank.requirements);
  if (requirements.length === 0) return null;
  return { rank, rankSlug, requirements };
}

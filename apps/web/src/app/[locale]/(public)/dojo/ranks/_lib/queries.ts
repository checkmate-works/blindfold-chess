import { unstable_cache } from 'next/cache';

import { asc, eq } from 'drizzle-orm';

import { RANKS_CACHE_TAG } from '@/lib/cache-tags';
import { db, ranks, userRanks } from '@/lib/db';
import { ALL_RANK_SLUGS, parseRequirements } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { resolveAchievedSlugs } from './rank-progression';

/**
 * The two `ranks` master reads, behind the Data Cache.
 *
 * `ranks` only changes when the seed runs at deploy, yet every dojo page,
 * every rank guide page and every public profile shell (via
 * `getAchievedSlugsForUser`) read it per render. Un-cached, each of those
 * renders spent a pooled connection on a table of fifteen rows — and the
 * session pooler's connection budget is shared across every warm instance,
 * so a crawler sweeping the guide pages in all four locales at once had
 * these SELECTs refused with `EMAXCONNSESSION`, failing the renders for
 * nothing more than rank names and colours. Cached, the sweep costs one
 * connection per revalidation instead of one per page.
 *
 * The revalidate is the only freshness bound (see {@link RANKS_CACHE_TAG}),
 * and it matches the layout's ISR default rather than undercutting it: this
 * value floors the effective interval of every prerendered dojo page that
 * reads it, so an hour here quietly held `dojo/ranks` and the rank and guide
 * detail pages at an hour whatever their own segment config said.
 * The rows are JSON round-tripped, so `createdAt` arrives as a string — no
 * dojo consumer reads it.
 *
 * Refused under the 2026-08-22 crawler sweep as Sentry BLINDFOLD-CHESS-60.
 */
export const getAllRanks = unstable_cache(
  async () => db.select().from(ranks).orderBy(asc(ranks.level)),
  ['ranks-all'],
  { tags: [RANKS_CACHE_TAG], revalidate: 604800 }
);

export const getRankBySlug = unstable_cache(
  async (slug: string) => {
    const rows = await db.select().from(ranks).where(eq(ranks.slug, slug)).limit(1);
    return rows[0] ?? null;
  },
  ['rank-by-slug'],
  { tags: [RANKS_CACHE_TAG], revalidate: 604800 }
);

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

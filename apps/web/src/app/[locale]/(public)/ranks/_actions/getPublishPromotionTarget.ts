'use server';

import { getOptionalUser, userHasProfile } from '@/lib/auth';
import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import type { RankSlug } from '@/lib/db/data/ranks';

import { isRankEarnedByPlaying, resolveNextRank } from '../_lib/helpers';
import { getAllRanks, getUserAchievedRankIds } from '../_lib/queries';

/**
 * The rank the caller would earn by publishing a won, constrained game right
 * now — or `null` if publishing one would not promote them.
 *
 * Answers the whole question server-side rather than shipping the rank table to
 * the client: the play screen only needs the verdict, and the belt progression
 * (achieved ranks, ordering, requirement types) is not its business.
 *
 * Null for anonymous and provisional users: `publishGameAction` records those
 * games with no author, so no rank could be granted and promising one would be
 * a lie.
 *
 * This only reports which rank is NEXT and that it is earned by playing. The
 * caller still has to establish that the game in hand qualifies (a win, played
 * under a constraint) — it is the only side that knows the game, which lives in
 * localStorage until publish.
 */
export async function getPublishPromotionTarget(): Promise<{ slug: RankSlug } | null> {
  const user = await getOptionalUser();
  if (!user) return null;
  if (!(await userHasProfile(user.id))) return null;

  const dbRanks = await getAllRanks();
  const achievedRankIds = await getUserAchievedRankIds(user.id);

  const achievedSlugs: ReadonlySet<RankSlug> = new Set(
    dbRanks
      .filter((r) => achievedRankIds.has(r.id))
      .map((r) => r.slug)
      .filter((slug): slug is RankSlug => (ALL_RANK_SLUGS as readonly string[]).includes(slug))
  );

  const { next } = resolveNextRank(dbRanks, achievedSlugs);
  if (!next || !isRankEarnedByPlaying(next.requirements)) return null;

  return { slug: next.slug };
}

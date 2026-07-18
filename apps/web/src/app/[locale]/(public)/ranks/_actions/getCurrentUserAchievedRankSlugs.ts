'use server';

import { getOptionalUser } from '@/lib/auth';

import { resolveAchievedSlugs, resolveEffectiveAchievedSlugs } from '../_lib/helpers';
import { getAllRanks, getUserAchievedRankIds } from '../_lib/queries';

/**
 * Return the EFFECTIVE set of rank slugs the currently-signed-in user has
 * achieved (see `resolveEffectiveAchievedSlugs` — every rank at or below the
 * highest literally-achieved rank counts too, matching the checkmark
 * semantics already used by the ranks grid and dojo curriculum). Empty
 * array for anonymous visitors.
 *
 * Returns `string[]` rather than `Set<RankSlug>` because Server Action
 * return values are JSON-serialised between server and client.
 */
export async function getCurrentUserAchievedRankSlugs(): Promise<string[]> {
  const user = await getOptionalUser();
  if (!user) return [];

  const [dbRanks, achievedRankIds] = await Promise.all([
    getAllRanks(),
    getUserAchievedRankIds(user.id),
  ]);
  const achievedSlugs = resolveAchievedSlugs(dbRanks, achievedRankIds);
  const effectiveSlugs = resolveEffectiveAchievedSlugs(achievedSlugs);

  // Mukyu is never a `user_ranks` row (it's the UI-only starting state), so
  // it never appears in `effectiveSlugs`. Mirror RanksGrid's own mukyu rule:
  // it counts as achieved once the user holds ANY real rank (surpassed, not
  // "pursuing"), but not for a freshly signed-in user with zero ranks.
  if (achievedSlugs.size > 0) {
    return [...effectiveSlugs, 'mukyu'];
  }
  return Array.from(effectiveSlugs);
}

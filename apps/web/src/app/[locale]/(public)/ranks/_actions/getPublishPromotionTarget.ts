'use server';

import { getOptionalUser, userHasProfile } from '@/lib/auth';
import type { RankSlug } from '@/lib/db/data/ranks';
import type { GuestPromotionQualification } from '@/lib/games/guest-promotion';

import { resolveAchievedSlugs } from '../_lib/helpers';
import { getAllRanks, getUserAchievedRankIds } from '../_lib/queries';

/**
 * The rank the caller would earn by publishing THIS game right now — or
 * `null` if publishing it would not promote them.
 *
 * The caller classifies the game client-side (it is the only side that
 * knows the game, which lives in localStorage until publish) and passes the
 * requirement tier it satisfies; this action contributes the half only the
 * server knows — which of those ranks the user has not earned yet. Ranks
 * are granted independently (skip-grants allowed), so any unachieved rank
 * whose game requirement this game satisfies is a truthful promise, even
 * for a brand-new player with no ranks at all.
 *
 * A '1dan'-grade game also satisfies 1kyu's looser bar, so when 1dan is
 * already held the promise falls back to 1kyu before giving up.
 *
 * Null for anonymous and provisional users: `publishGameAction` records
 * those games with no author, so no rank could be granted and promising one
 * would be a lie (they get the guest pitch instead).
 */
export async function getPublishPromotionTarget(
  qualification: GuestPromotionQualification
): Promise<RankSlug | null> {
  if (qualification !== '1kyu' && qualification !== '1dan') return null;

  const user = await getOptionalUser();
  if (!user) return null;
  if (!(await userHasProfile(user.id))) return null;

  const [dbRanks, achievedRankIds] = await Promise.all([
    getAllRanks(),
    getUserAchievedRankIds(user.id),
  ]);
  const achieved = resolveAchievedSlugs(dbRanks, achievedRankIds);

  if (qualification === '1dan') {
    if (!achieved.has('1dan')) return '1dan';
    if (!achieved.has('1kyu')) return '1kyu';
    return null;
  }

  return achieved.has('1kyu') ? null : '1kyu';
}

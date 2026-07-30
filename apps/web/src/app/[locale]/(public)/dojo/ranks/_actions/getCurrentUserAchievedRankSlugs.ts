'use server';

import { getOptionalUser } from '@/lib/auth';

import { getAchievedSlugsForUser } from '../_lib/queries';
import { resolveDisplayAchievedSlugs } from '../_lib/rank-progression';

/**
 * Return the DISPLAY set of rank slugs the currently-signed-in user has
 * achieved (see `resolveDisplayAchievedSlugs` — every rank at or below the
 * highest literally-achieved rank counts too, plus mukyu once any real rank
 * is held, matching the checkmark semantics used by the ranks grid and dojo
 * curriculum). Empty array for anonymous visitors.
 *
 * Returns `string[]` rather than `Set<RankSlug>` because Server Action
 * return values are JSON-serialised between server and client.
 */
export async function getCurrentUserAchievedRankSlugs(): Promise<string[]> {
  const user = await getOptionalUser();
  if (!user) return [];

  const achievedSlugs = await getAchievedSlugsForUser(user.id);
  return Array.from(resolveDisplayAchievedSlugs(achievedSlugs));
}

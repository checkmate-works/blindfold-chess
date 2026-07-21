'use server';

import { getOptionalUser } from '@/lib/auth';

import { getUserAchievedRankIds } from '../_lib/queries';

/**
 * Return the set of rank IDs the currently-signed-in user has achieved, or
 * an empty array for anonymous visitors. Used by the ISR-cached ranks page
 * to overlay per-user achievement state on the otherwise-static grid.
 *
 * Returns `string[]` rather than `Set<string>` because Server Action return
 * values are JSON-serialised between server and client.
 */
export async function getCurrentUserAchievedRankIds(): Promise<string[]> {
  const user = await getOptionalUser();
  if (!user) return [];
  const ids = await getUserAchievedRankIds(user.id);
  return Array.from(ids);
}

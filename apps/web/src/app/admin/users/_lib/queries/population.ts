import { cache } from 'react';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { inArray } from 'drizzle-orm';

import { db, profiles, ranks, userExp, userRanks } from '@/lib/db';
import type { Profile, Rank } from '@/lib/db/schema';
import { listAllAuthUsers } from '@/lib/supabase/list-all-auth-users';

import type { AdminUserFilters } from '../filters';
import { createPopulationFilter, groupRankSlugsByUser } from './population-filter';

export type FilteredPopulation = {
  filteredUsers: User[];
  /** Profile rows for all fetched auth users, keyed by user id. */
  profileMap: Map<string, Profile>;
  /** For each user id in the filtered population, the set of rank slugs they hold. */
  userSlugs: Map<string, Set<string>>;
};

/**
 * Cumulative Exp per user, for the given ids. Users with no `user_exp` row
 * are simply absent from the map — callers read that absence as "never
 * saved a result" (see `resolveLevelBucket`).
 */
export async function fetchTotalExpByUser(
  userIds: readonly string[]
): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ userId: userExp.userId, totalExp: userExp.totalExp })
    .from(userExp)
    .where(inArray(userExp.userId, [...userIds]));
  return new Map(rows.map((r) => [r.userId, r.totalExp]));
}

/**
 * Cached fetch of the full `ranks` master table. Shared across all callers
 * in the same request so rank-stats and rank filtering reuse one query.
 */
export const getAllRanks = cache(async (): Promise<Map<string, Rank>> => {
  const allRanksData = await db.select().from(ranks);
  return new Map(allRanksData.map((r) => [r.id, r]));
});

/**
 * Fetch and filter the full user population for a given filter combination.
 *
 * Wrapped in React's `cache()` so multiple callers in the same request
 * (users list, country stats, rank stats, signup method stats) share a
 * single expensive Supabase Auth pagination pass.
 *
 * The cache key is the full argument tuple — different filter combinations
 * produce independent cache entries, but repeated calls with identical
 * arguments return the same promise.
 */
export const getFilteredPopulation = cache(
  async (adminClient: SupabaseClient, filters: AdminUserFilters): Promise<FilteredPopulation> => {
    const allUsers = await listAllAuthUsers(adminClient);
    const allUserIds = allUsers.map((u) => u.id);

    const allProfiles =
      allUserIds.length > 0
        ? await db.select().from(profiles).where(inArray(profiles.id, allUserIds))
        : [];
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    // Fetch rank membership only when a rank filter is active. The stats
    // callers (`fetchRankStats`) pull the full ranks master table and user
    // rank rows separately via `getAllRanks` / their own query, so the
    // population view here only needs `userSlugs` for filtering.
    const userSlugs =
      filters.rankFilter && allUserIds.length > 0
        ? groupRankSlugsByUser(
            await db.select().from(userRanks).where(inArray(userRanks.userId, allUserIds)),
            await getAllRanks()
          )
        : new Map<string, Set<string>>();

    // Likewise, cumulative Exp is only needed to apply a level filter;
    // `fetchLevelStats` fetches it for the filtered population itself.
    const totalExpByUser = filters.levelFilter
      ? await fetchTotalExpByUser(allUserIds)
      : new Map<string, number>();

    const matches = createPopulationFilter(filters);
    const filteredUsers = allUsers.filter((user) =>
      matches(user, profileMap.get(user.id), userSlugs.get(user.id), totalExpByUser.get(user.id))
    );

    return { filteredUsers, profileMap, userSlugs };
  }
);

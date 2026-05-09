import { cache } from 'react';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { inArray } from 'drizzle-orm';

import { db, profiles, ranks, userRanks } from '@/lib/db';
import { MUKYU_SLUG } from '@/lib/db/data/ranks';
import { listAllAuthUsers } from '@/lib/supabase/list-all-auth-users';

import type { AdminUserFilters } from '../filters';
import { getSignupMethod } from './signup-methods';

type Profile = typeof profiles.$inferSelect;
type Rank = typeof ranks.$inferSelect;

export type FilteredPopulation = {
  filteredUsers: User[];
  /** Profile rows for all fetched auth users, keyed by user id. */
  profileMap: Map<string, Profile>;
  /** For each user id in the filtered population, the set of rank slugs they hold. */
  userSlugs: Map<string, Set<string>>;
};

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
    const { statusFilter, countryFilter, rankFilter, providerFilter, usernameFilter } = filters;
    const normalizedUsernameQuery = usernameFilter.trim().toLowerCase();
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
    const userSlugs = new Map<string, Set<string>>();
    if (rankFilter && allUserIds.length > 0) {
      const rankById = await getAllRanks();
      const userRankRows = await db
        .select()
        .from(userRanks)
        .where(inArray(userRanks.userId, allUserIds));

      for (const ur of userRankRows) {
        const rank = rankById.get(ur.rankId);
        if (rank) {
          const slugs = userSlugs.get(ur.userId) ?? new Set<string>();
          slugs.add(rank.slug);
          userSlugs.set(ur.userId, slugs);
        }
      }
    }

    const filteredUsers = allUsers.filter((user) => {
      const profile = profileMap.get(user.id);

      // Status filter
      switch (statusFilter) {
        case 'active':
          if (!(profile != null && profile.deletedAt == null && profile.bannedAt == null))
            return false;
          break;
        case 'banned':
          if (!(profile != null && profile.deletedAt == null && profile.bannedAt != null))
            return false;
          break;
        case 'anonymous':
          if (profile != null) return false;
          break;
        case 'deleted':
          if (!(profile != null && profile.deletedAt != null)) return false;
          break;
      }

      // Country filter
      if (countryFilter) {
        const userCountry = profile?.country ?? 'Unknown';
        if (userCountry !== countryFilter) return false;
      }

      // Rank filter
      if (rankFilter) {
        if (rankFilter === MUKYU_SLUG) {
          // Mukyu = user has no rank records
          if (userSlugs.has(user.id)) return false;
        } else {
          const held = userSlugs.get(user.id);
          if (!held || !held.has(rankFilter)) return false;
        }
      }

      // Signup method (provider) filter
      if (providerFilter) {
        if (getSignupMethod(user) !== providerFilter) return false;
      }

      // Username filter — case-insensitive partial match on profiles.username.
      // Users without a profile (anonymous) never match; `username` is
      // non-null on the profiles table, so a present profile always has a
      // comparable string.
      if (normalizedUsernameQuery) {
        const username = profile?.username;
        if (!username) return false;
        if (!username.toLowerCase().includes(normalizedUsernameQuery)) return false;
      }

      return true;
    });

    return { filteredUsers, profileMap, userSlugs };
  }
);

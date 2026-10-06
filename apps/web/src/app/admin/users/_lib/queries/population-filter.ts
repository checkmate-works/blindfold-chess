import type { User } from '@supabase/supabase-js';

import { MUKYU_SLUG, resolveHighestRankSlug } from '@/lib/db/data/ranks';
import type { Profile } from '@/lib/db/schema';

import type { AdminUserFilters } from '../filters';
import { UNKNOWN_COUNTRY } from './country-stats';
import { resolveLevelBucket } from './level-stats';
import { getSignupMethod } from './signup-methods';

/**
 * Group `user_ranks` rows into the set of rank slugs each user holds. Rows
 * whose rank id is missing from the master table are dropped.
 */
export function groupRankSlugsByUser(
  userRankRows: readonly { userId: string; rankId: string }[],
  rankById: ReadonlyMap<string, { slug: string }>
): Map<string, Set<string>> {
  const userSlugs = new Map<string, Set<string>>();
  for (const ur of userRankRows) {
    const rank = rankById.get(ur.rankId);
    if (rank) {
      const slugs = userSlugs.get(ur.userId) ?? new Set<string>();
      slugs.add(rank.slug);
      userSlugs.set(ur.userId, slugs);
    }
  }
  return userSlugs;
}

/**
 * Build the predicate that decides whether one auth user belongs to the
 * admin users population for `filters`. `profile` is `undefined` for an
 * anonymous user; `heldSlugs` is only consulted when a rank filter is set,
 * and `totalExp` (the user's `user_exp` row, `undefined` when they have
 * none) only when a level filter is set.
 */
export function createPopulationFilter(
  filters: AdminUserFilters
): (
  user: User,
  profile: Profile | undefined,
  heldSlugs: ReadonlySet<string> | undefined,
  totalExp?: number
) => boolean {
  const { statusFilter, countryFilter, rankFilter, levelFilter, providerFilter, usernameFilter } =
    filters;
  const normalizedSearchQuery = usernameFilter.trim().toLowerCase();

  return (user, profile, held, totalExp) => {
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
      const userCountry = profile?.country ?? UNKNOWN_COUNTRY;
      if (userCountry !== countryFilter) return false;
    }

    // Rank filter — bucket each user at their HIGHEST held rank, matching
    // the "Users by Rank" chart that links here. Filtering on mere
    // membership would put a user who holds both 1kyu and 1dan in both
    // `?rank=1kyu` and `?rank=1dan`, and the list would then disagree with
    // the bar the admin just clicked.
    if (rankFilter) {
      if (rankFilter === MUKYU_SLUG) {
        // Mukyu = user has no rank records
        if (held && held.size > 0) return false;
      } else {
        if (!held || resolveHighestRankSlug(held) !== rankFilter) return false;
      }
    }

    // Level filter — bucket by the same rule as the "Users by Level" chart
    // (`aggregateLevelStats`), so a bar click lands on exactly that many users.
    if (levelFilter) {
      if (resolveLevelBucket(totalExp) !== levelFilter) return false;
    }

    // Signup method (provider) filter
    if (providerFilter) {
      if (getSignupMethod(user) !== providerFilter) return false;
    }

    // Search filter — case-insensitive partial match on either
    // `profiles.username` or `auth.users.email`. Anonymous users (no
    // profile) can still match by email; unverified/missing emails fall
    // through to the username comparison.
    if (normalizedSearchQuery) {
      const username = profile?.username?.toLowerCase();
      const email = user.email?.toLowerCase();
      const usernameMatches = username?.includes(normalizedSearchQuery) ?? false;
      const emailMatches = email?.includes(normalizedSearchQuery) ?? false;
      if (!usernameMatches && !emailMatches) return false;
    }

    return true;
  };
}

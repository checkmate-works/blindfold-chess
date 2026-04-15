import type { SupabaseClient, User } from '@supabase/supabase-js';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { BENEFIT_ACTIVE_STATUSES } from '@/lib/billing/subscription-constants';
import {
  db,
  moderationActions,
  profiles,
  ranks,
  subscriptions,
  userRanks,
  userRoles,
} from '@/lib/db';
import {
  ALL_RANK_SLUGS,
  BELT_COLOR_HEX,
  MUKYU_SLUG,
  RANK_COLORS,
  ranksSeedData,
} from '@/lib/db/data/ranks';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';

import { SIGNUP_METHOD_ORDER, type SignupMethod } from './signup-method';

const FETCH_ALL_PAGE_SIZE = 1000;
const MAX_PAGES = 100;

type Profile = typeof profiles.$inferSelect;

/**
 * Classify a Supabase auth user's signup provider into one of three buckets:
 * `google`, `email`, or `unknown` (any other / missing provider).
 *
 * Reads `user.app_metadata.provider` first (the canonical field), falling back
 * to the first entry of `user.identities` for legacy rows.
 */
function getSignupMethod(user: User): SignupMethod {
  const appMetaProvider =
    typeof user.app_metadata === 'object' && user.app_metadata !== null
      ? (user.app_metadata as Record<string, unknown>).provider
      : undefined;
  const identityProvider = user.identities?.[0]?.provider;
  const provider =
    typeof appMetaProvider === 'string' && appMetaProvider.length > 0
      ? appMetaProvider
      : typeof identityProvider === 'string' && identityProvider.length > 0
        ? identityProvider
        : '';

  if (provider === 'google') return 'google';
  if (provider === 'email') return 'email';
  return 'unknown';
}

async function fetchAllUsers(adminClient: SupabaseClient): Promise<User[]> {
  const allUsers: User[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: FETCH_ALL_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to fetch users (page ${page}): ${error.message}`);
    }

    const users = data?.users ?? [];
    allUsers.push(...users);

    if (users.length < FETCH_ALL_PAGE_SIZE) break;
    page++;
  }

  return allUsers;
}

type FilteredUsersResult = {
  filteredUsers: User[];
  profileMap: Map<string, Profile>;
};

async function fetchFilteredUsers(
  adminClient: SupabaseClient,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string
): Promise<FilteredUsersResult> {
  const allUsers = await fetchAllUsers(adminClient);
  const allUserIds = allUsers.map((u) => u.id);

  const allProfiles =
    allUserIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, allUserIds))
      : [];
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  // Build rank lookup if rank filter is active
  let rankedUserSlugs: Map<string, Set<string>> | null = null;
  if (rankFilter) {
    rankedUserSlugs = new Map();
    if (allUserIds.length > 0) {
      const allRanksData = await db.select().from(ranks);
      const rankById = new Map(allRanksData.map((r) => [r.id, r]));

      const userRankRows = await db
        .select()
        .from(userRanks)
        .where(inArray(userRanks.userId, allUserIds));

      for (const ur of userRankRows) {
        const rank = rankById.get(ur.rankId);
        if (rank) {
          const slugs = rankedUserSlugs.get(ur.userId) ?? new Set<string>();
          slugs.add(rank.slug);
          rankedUserSlugs.set(ur.userId, slugs);
        }
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
    if (rankFilter && rankedUserSlugs) {
      if (rankFilter === MUKYU_SLUG) {
        // Mukyu = user has no rank records
        if (rankedUserSlugs.has(user.id)) return false;
      } else {
        const userSlugs = rankedUserSlugs.get(user.id);
        if (!userSlugs || !userSlugs.has(rankFilter)) return false;
      }
    }

    // Signup method (provider) filter
    if (providerFilter) {
      if (getSignupMethod(user) !== providerFilter) return false;
    }

    return true;
  });

  return { filteredUsers, profileMap };
}

export type UsersPageData = {
  users: User[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  profileMap: Map<string, Profile>;
  roleMap: Map<string, string>;
  subscriptionMap: Map<string, string>;
  banReasonMap: Map<string, string | null>;
};

export async function fetchUsersPageData(
  adminClient: SupabaseClient,
  page: number,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string
): Promise<UsersPageData> {
  let users: User[];
  let currentPage: number;
  let totalPages: number;
  let totalCount: number;
  let profileMap: Map<string, Profile>;

  const hasFilter = statusFilter || countryFilter || rankFilter || providerFilter;

  if (hasFilter) {
    const { filteredUsers, profileMap: allProfileMap } = await fetchFilteredUsers(
      adminClient,
      statusFilter,
      countryFilter,
      rankFilter,
      providerFilter
    );

    totalCount = filteredUsers.length;
    const pagination = getPaginationParams(page, totalCount);
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    users = filteredUsers.slice(pagination.offset, pagination.offset + pagination.limit);

    profileMap = new Map<string, Profile>();
    for (const u of users) {
      const p = allProfileMap.get(u.id);
      if (p) profileMap.set(u.id, p);
    }
  } else {
    const { data: usersData } = await adminClient.auth.admin.listUsers({
      page: page,
      perPage: DEFAULT_PAGE_SIZE,
    });

    users = usersData?.users ?? [];
    totalCount = usersData && 'total' in usersData ? (usersData.total as number) : 0;
    const pagination = getPaginationParams(page, totalCount);
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    const userIds = users.map((u) => u.id);
    const userProfiles =
      userIds.length > 0
        ? await db.select().from(profiles).where(inArray(profiles.id, userIds))
        : [];
    profileMap = new Map(userProfiles.map((p) => [p.id, p]));
  }

  const userIds = users.map((u) => u.id);

  const roles =
    userIds.length > 0
      ? await db.select().from(userRoles).where(inArray(userRoles.userId, userIds))
      : [];
  const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

  const userSubscriptions =
    userIds.length > 0
      ? await db
          .select({ userId: subscriptions.userId, status: subscriptions.status })
          .from(subscriptions)
          .where(
            and(
              inArray(subscriptions.userId, userIds),
              inArray(subscriptions.status, [...BENEFIT_ACTIVE_STATUSES])
            )
          )
      : [];
  const subscriptionMap = new Map(userSubscriptions.map((s) => [s.userId, s.status]));

  const bannedUserIds = [...profileMap.values()].filter((p) => p.bannedAt != null).map((p) => p.id);
  const banReasonMap = new Map<string, string | null>();
  if (bannedUserIds.length > 0) {
    const banReasons = await db
      .select({
        targetId: moderationActions.targetId,
        reason: moderationActions.reason,
        createdAt: moderationActions.createdAt,
      })
      .from(moderationActions)
      .where(
        and(
          eq(moderationActions.action, 'ban'),
          eq(moderationActions.targetType, 'user'),
          inArray(moderationActions.targetId, bannedUserIds)
        )
      )
      .orderBy(desc(moderationActions.createdAt));

    for (const row of banReasons) {
      if (!banReasonMap.has(row.targetId)) {
        banReasonMap.set(row.targetId, row.reason);
      }
    }
  }

  return {
    users,
    currentPage,
    totalPages,
    totalCount,
    profileMap,
    roleMap,
    subscriptionMap,
    banReasonMap,
  };
}

export type CountryStat = {
  country: string;
  count: number;
};

export async function fetchCountryStats(
  adminClient: SupabaseClient,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string
): Promise<CountryStat[]> {
  // Always use fetchFilteredUsers to ensure the same user population as the list view.
  // When all filters are empty, fetchFilteredUsers returns all users (default branch).
  const { filteredUsers, profileMap } = await fetchFilteredUsers(
    adminClient,
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter
  );

  const countMap = new Map<string, number>();
  for (const user of filteredUsers) {
    const profile = profileMap.get(user.id);
    const country = profile?.country ?? 'Unknown';
    countMap.set(country, (countMap.get(country) ?? 0) + 1);
  }

  return Array.from(countMap.entries())
    .map(([country, cnt]) => ({ country, count: cnt }))
    .sort((a, b) => b.count - a.count);
}

export type RankStat = {
  slug: string;
  name: string;
  count: number;
  color: string;
  level: number;
};

/**
 * Fetch user counts grouped by rank, including unranked (mukyu) users.
 *
 * Mukyu count = total filtered users - users who hold at least one rank.
 * Coming Soon ranks (with no requirements defined) are included with count 0.
 */
export async function fetchRankStats(
  adminClient: SupabaseClient,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string
): Promise<RankStat[]> {
  const { filteredUsers } = await fetchFilteredUsers(
    adminClient,
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter
  );
  const filteredUserIds = filteredUsers.map((u) => u.id);

  // Fetch all rank records from DB to map rankId → slug
  const allRanks = await db.select().from(ranks);
  const rankById = new Map(allRanks.map((r) => [r.id, r]));

  // Count users per rank (only for filtered users)
  const rankCountMap = new Map<string, number>();
  const rankedUserIds = new Set<string>();

  if (filteredUserIds.length > 0) {
    const userRankRows = await db
      .select()
      .from(userRanks)
      .where(inArray(userRanks.userId, filteredUserIds));

    for (const ur of userRankRows) {
      const rank = rankById.get(ur.rankId);
      if (rank) {
        rankedUserIds.add(ur.userId);
        rankCountMap.set(rank.slug, (rankCountMap.get(rank.slug) ?? 0) + 1);
      }
    }
  }

  // Build level map from seed data + mukyu
  const levelMap = new Map<string, number>();
  levelMap.set(MUKYU_SLUG, 0);
  for (const seed of ranksSeedData) {
    levelMap.set(seed.slug, seed.level);
  }

  // Build results for all ranks in ALL_RANK_SLUGS order
  const mukyuCount = filteredUsers.length - rankedUserIds.size;

  return ALL_RANK_SLUGS.map((slug) => {
    const colorName = RANK_COLORS[slug];
    const hexColor = BELT_COLOR_HEX[colorName] ?? '#888888';

    return {
      slug,
      name: slug, // Will be replaced with i18n label by the component
      count: slug === MUKYU_SLUG ? mukyuCount : (rankCountMap.get(slug) ?? 0),
      color: hexColor,
      level: levelMap.get(slug) ?? 0,
    };
  }).sort((a, b) => a.level - b.level);
}

export type SignupMethodStat = {
  method: SignupMethod;
  count: number;
};

/**
 * Fetch user counts grouped by signup method (google / email / unknown).
 *
 * Mirrors `fetchCountryStats` — uses the same filtered user population so the
 * chart is consistent with the list view. Always returns all three buckets in
 * a fixed order (google → email → unknown), even when a bucket is empty, so
 * the chart is stable across renders.
 */
export async function fetchSignupMethodStats(
  adminClient: SupabaseClient,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string
): Promise<SignupMethodStat[]> {
  const { filteredUsers } = await fetchFilteredUsers(
    adminClient,
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter
  );

  const countMap = new Map<SignupMethod, number>();
  for (const method of SIGNUP_METHOD_ORDER) countMap.set(method, 0);
  for (const user of filteredUsers) {
    const method = getSignupMethod(user);
    countMap.set(method, (countMap.get(method) ?? 0) + 1);
  }

  return SIGNUP_METHOD_ORDER.map((method) => ({
    method,
    count: countMap.get(method) ?? 0,
  }));
}

export { getSignupMethod };

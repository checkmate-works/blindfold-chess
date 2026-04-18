import type { SupabaseClient, User } from '@supabase/supabase-js';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { BENEFIT_ACTIVE_STATUSES } from '@/lib/billing/subscription-constants';
import { db, moderationActions, profiles, subscriptions, userRanks, userRoles } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';

import { type CountryStat, aggregateCountryStats } from './country-stats';
import { getAllRanks, getFilteredPopulation } from './population';
import { type RankStat, aggregateRankStats } from './rank-stats';
import { type SignupMethodStat, aggregateSignupMethodStats } from './signup-methods';

type Profile = typeof profiles.$inferSelect;

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
  providerFilter?: string,
  usernameFilter?: string
): Promise<UsersPageData> {
  let users: User[];
  let currentPage: number;
  let totalPages: number;
  let totalCount: number;
  let profileMap: Map<string, Profile>;

  const hasFilter = statusFilter || countryFilter || rankFilter || providerFilter || usernameFilter;

  if (hasFilter) {
    const { filteredUsers, profileMap: allProfileMap } = await getFilteredPopulation(
      adminClient,
      statusFilter,
      countryFilter,
      rankFilter,
      providerFilter,
      usernameFilter
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

/**
 * Fetch user counts grouped by country.
 *
 * Uses `getFilteredPopulation` (cache-wrapped) so subsequent stat fetches
 * in the same request reuse the same expensive Supabase Auth pagination.
 */
export async function fetchCountryStats(
  adminClient: SupabaseClient,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string,
  usernameFilter?: string
): Promise<CountryStat[]> {
  const { filteredUsers, profileMap } = await getFilteredPopulation(
    adminClient,
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter,
    usernameFilter
  );
  return aggregateCountryStats(filteredUsers, profileMap);
}

/**
 * Fetch user counts grouped by rank, including unranked (mukyu) users.
 *
 * Uses `getFilteredPopulation` (cache-wrapped) and delegates aggregation
 * to the pure `aggregateRankStats` helper.
 */
export async function fetchRankStats(
  adminClient: SupabaseClient,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string,
  usernameFilter?: string
): Promise<RankStat[]> {
  const { filteredUsers } = await getFilteredPopulation(
    adminClient,
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter,
    usernameFilter
  );

  const filteredUserIds = filteredUsers.map((u) => u.id);
  const rankById = await getAllRanks();

  const userRankRows =
    filteredUserIds.length > 0
      ? await db.select().from(userRanks).where(inArray(userRanks.userId, filteredUserIds))
      : [];

  const userSlugs = new Map<string, Set<string>>();
  for (const ur of userRankRows) {
    const rank = rankById.get(ur.rankId);
    if (rank) {
      const slugs = userSlugs.get(ur.userId) ?? new Set<string>();
      slugs.add(rank.slug);
      userSlugs.set(ur.userId, slugs);
    }
  }

  return aggregateRankStats(filteredUsers, { rankById, userSlugs });
}

/**
 * Fetch user counts grouped by signup method (google / email / unknown).
 *
 * Mirrors `fetchCountryStats` — uses the cached population so the chart is
 * consistent with the list view, and delegates aggregation to the pure
 * `aggregateSignupMethodStats` helper.
 */
export async function fetchSignupMethodStats(
  adminClient: SupabaseClient,
  statusFilter: string,
  countryFilter?: string,
  rankFilter?: string,
  providerFilter?: string,
  usernameFilter?: string
): Promise<SignupMethodStat[]> {
  const { filteredUsers } = await getFilteredPopulation(
    adminClient,
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter,
    usernameFilter
  );
  return aggregateSignupMethodStats(filteredUsers);
}

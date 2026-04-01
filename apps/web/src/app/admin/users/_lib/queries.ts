import type { SupabaseClient, User } from '@supabase/supabase-js';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db, moderationActions, profiles, subscriptions, userRoles } from '@/lib/db';
import { BENEFIT_ACTIVE_STATUSES } from '@/lib/subscription-constants';

import { DEFAULT_PAGE_SIZE, getPaginationData } from '../../_lib/pagination';

const FETCH_ALL_PAGE_SIZE = 1000;
const MAX_PAGES = 100;

type Profile = typeof profiles.$inferSelect;

export async function fetchAllUsers(adminClient: SupabaseClient): Promise<User[]> {
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

export type UsersPageData = {
  users: User[];
  currentPage: number;
  totalPages: number;
  profileMap: Map<string, Profile>;
  roleMap: Map<string, string>;
  subscriptionMap: Map<string, string>;
  banReasonMap: Map<string, string | null>;
};

export async function fetchUsersPageData(
  adminClient: SupabaseClient,
  page: number,
  statusFilter: string
): Promise<UsersPageData> {
  let users: User[];
  let currentPage: number;
  let totalPages: number;
  let profileMap: Map<string, Profile>;

  if (statusFilter) {
    const allUsers = await fetchAllUsers(adminClient);
    const allUserIds = allUsers.map((u) => u.id);

    const allProfiles =
      allUserIds.length > 0
        ? await db.select().from(profiles).where(inArray(profiles.id, allUserIds))
        : [];
    const allProfileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const filtered = allUsers.filter((user) => {
      const profile = allProfileMap.get(user.id);
      switch (statusFilter) {
        case 'active':
          return profile != null && profile.deletedAt == null && profile.bannedAt == null;
        case 'banned':
          return profile != null && profile.deletedAt == null && profile.bannedAt != null;
        case 'anonymous':
          return profile == null;
        case 'deleted':
          return profile != null && profile.deletedAt != null;
        default:
          return true;
      }
    });

    const totalCount = filtered.length;
    const pagination = getPaginationData(page, totalCount);
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    users = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

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
    const totalCount = usersData && 'total' in usersData ? usersData.total : 0;
    const pagination = getPaginationData(page, totalCount);
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
    profileMap,
    roleMap,
    subscriptionMap,
    banReasonMap,
  };
}

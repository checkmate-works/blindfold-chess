import type { SupabaseClient, User } from '@supabase/supabase-js';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { db, profiles, userActivityLog } from '@/lib/db';

import { loadUsersEmailMap } from '../../_lib/users-email-map';

const PAGE_SIZE = 20;

type ActivityLog = typeof userActivityLog.$inferSelect;
type Profile = typeof profiles.$inferSelect;

export type ActivityLogPageData = {
  logs: ActivityLog[];
  currentPage: number;
  totalPages: number;
  profileMap: Map<string, Profile>;
  emailMap: Map<string, string>;
  actionTypes: { action: string }[];
};

export async function fetchActivityLogPageData(
  adminClient: SupabaseClient,
  page: number,
  actionFilter: string,
  userFilter: string
): Promise<ActivityLogPageData> {
  const currentPage = Math.max(1, page);

  // Build where conditions
  const conditions = [];
  if (actionFilter) {
    conditions.push(eq(userActivityLog.action, actionFilter));
  }

  // If user filter is set, find matching user IDs from profiles
  let filteredUserIds: string[] | null = null;
  // Cache the auth user list fetched while resolving the user filter so the
  // later email-map step can reuse it instead of paying for a second
  // identical `listUsers` round-trip in the same request.
  let preloadedAuthUsers: User[] | undefined;
  if (userFilter) {
    const matchingProfiles = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        or(
          ilike(profiles.username, `%${userFilter}%`),
          ilike(profiles.displayName, `%${userFilter}%`)
        )
      );

    // Also search by email via Supabase admin client
    const listUsersResult = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    preloadedAuthUsers = listUsersResult.data?.users;
    const matchingEmailUserIds = (preloadedAuthUsers ?? [])
      .filter((u) => u.email?.toLowerCase().includes(userFilter.toLowerCase()))
      .map((u) => u.id);

    const allMatchingIds = [
      ...new Set([...matchingProfiles.map((p) => p.id), ...matchingEmailUserIds]),
    ];

    if (allMatchingIds.length === 0) {
      filteredUserIds = [];
    } else {
      filteredUserIds = allMatchingIds;
      conditions.push(inArray(userActivityLog.userId, allMatchingIds));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userActivityLog)
    .where(whereClause);
  const totalCount = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Fetch logs for current page
  const logs =
    filteredUserIds?.length === 0
      ? []
      : await db
          .select()
          .from(userActivityLog)
          .where(whereClause)
          .orderBy(desc(userActivityLog.createdAt))
          .limit(PAGE_SIZE)
          .offset((currentPage - 1) * PAGE_SIZE);

  // Collect unique user IDs for lookups
  const userIds = [...new Set(logs.map((l) => l.userId))];
  const targetIds = [...new Set(logs.filter((l) => l.targetId).map((l) => l.targetId!))];
  const allLookupIds = [...new Set([...userIds, ...targetIds])];

  // Fetch profiles
  const lookupProfiles =
    allLookupIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, allLookupIds))
      : [];
  const profileMap = new Map(lookupProfiles.map((p) => [p.id, p]));

  // Fetch emails from Supabase Auth. Reuses the user list already fetched
  // above (when a user filter was active) to avoid a second identical Auth
  // round-trip in the same request.
  const emailMap = await loadUsersEmailMap(allLookupIds, {
    adminClient,
    preloadedUsers: preloadedAuthUsers,
  });

  // Get distinct action types for filter dropdown
  const actionTypes = await db
    .selectDistinct({ action: userActivityLog.action })
    .from(userActivityLog)
    .orderBy(userActivityLog.action);

  return {
    logs,
    currentPage,
    totalPages,
    profileMap,
    emailMap,
    actionTypes,
  };
}

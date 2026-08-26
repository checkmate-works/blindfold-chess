import type { SupabaseClient } from '@supabase/supabase-js';
import { desc, eq, inArray } from 'drizzle-orm';

import { db, profiles, userActivityLog } from '@/lib/db';
import { combineConditions, countRows } from '@/lib/db/list-query';
import type { Profile, UserActivityLog } from '@/lib/db/schema';
import { getPaginationParams } from '@/lib/pagination';

import { resolveUserFilter } from '../../_lib/resolve-user-filter';

const PAGE_SIZE = 20;

export type ActivityLogPageData = {
  logs: UserActivityLog[];
  currentPage: number;
  totalPages: number;
  profileMap: Map<string, Profile>;
  actionTypes: { action: string }[];
};

export async function fetchActivityLogPageData(
  adminClient: SupabaseClient,
  page: number,
  actionFilter: string,
  userFilter: string
): Promise<ActivityLogPageData> {
  // Build where conditions
  const conditions = [];
  if (actionFilter) {
    conditions.push(eq(userActivityLog.action, actionFilter));
  }

  // If user filter is set, find matching user IDs from profiles
  let filteredUserIds: string[] | null = null;
  if (userFilter) {
    const resolved = await resolveUserFilter(adminClient, userFilter);
    filteredUserIds = resolved.matchingIds;
    if (resolved.matchingIds.length > 0) {
      conditions.push(inArray(userActivityLog.userId, resolved.matchingIds));
    }
  }

  const whereClause = combineConditions(conditions);

  // Get total count for pagination
  const totalCount = await countRows(userActivityLog, whereClause);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    PAGE_SIZE
  );

  // Fetch logs for current page
  const logs =
    filteredUserIds?.length === 0
      ? []
      : await db
          .select()
          .from(userActivityLog)
          .where(whereClause)
          .orderBy(desc(userActivityLog.createdAt))
          .limit(limit)
          .offset(offset);

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
    actionTypes,
  };
}

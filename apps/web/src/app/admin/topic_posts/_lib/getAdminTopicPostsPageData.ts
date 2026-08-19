import type { SupabaseClient, User } from '@supabase/supabase-js';
import { desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { db, profiles, topicPosts } from '@/lib/db';
import { combineConditions, countRows } from '@/lib/db/list-query';
import type { Profile, TopicPost } from '@/lib/db/schema';
import { getPaginationParams } from '@/lib/pagination';

import { resolveUserFilter } from '../../_lib/resolve-user-filter';
import { loadUsersEmailMap } from '../../_lib/users-email-map';

export type AdminTopicPostsPageData = {
  posts: TopicPost[];
  profileMap: Map<string, Profile>;
  emailMap: Map<string, string>;
  topicTypes: { topicType: string }[];
  currentPage: number;
  totalPages: number;
};

/**
 * Load the admin topic-posts list view, applying the active filters.
 *
 * Resolves the free-text user filter against `profiles.username /
 * displayName` AND Supabase Auth `users.email` (the latter via the admin
 * client, capped at 100 users — same scope as the original page). The
 * Supabase auth list fetched here is forwarded to `loadUsersEmailMap`
 * so the per-row email column reuses it instead of re-paging the same
 * 100 users a second time in the same request.
 */
export async function getAdminTopicPostsPageData({
  adminClient,
  page,
  userFilter,
  topicTypeFilter,
  statusFilter,
}: {
  adminClient: SupabaseClient;
  page: number;
  userFilter: string;
  topicTypeFilter: string;
  statusFilter: string;
}): Promise<AdminTopicPostsPageData> {
  const conditions = [];
  if (topicTypeFilter) {
    conditions.push(eq(topicPosts.topicType, topicTypeFilter));
  }
  if (statusFilter === 'active') {
    conditions.push(isNull(topicPosts.deletedAt));
  } else if (statusFilter === 'deleted') {
    conditions.push(isNotNull(topicPosts.deletedAt));
  }

  let filteredUserIds: string[] | null = null;
  let preloadedAuthUsers: User[] | undefined;

  if (userFilter) {
    const resolved = await resolveUserFilter(adminClient, userFilter);
    preloadedAuthUsers = resolved.preloadedAuthUsers;
    filteredUserIds = resolved.matchingIds;
    if (resolved.matchingIds.length > 0) {
      conditions.push(inArray(topicPosts.userId, resolved.matchingIds));
    }
  }

  const whereClause = combineConditions(conditions);

  const totalCount = await countRows(topicPosts, whereClause);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(page, totalCount);

  const posts =
    filteredUserIds?.length === 0
      ? []
      : await db
          .select()
          .from(topicPosts)
          .where(whereClause)
          .orderBy(desc(topicPosts.createdAt))
          .limit(limit)
          .offset(offset);

  // Anonymised posts (author purged) carry user_id = NULL and have no profile
  // or email to resolve — drop them before the lookups.
  const authorIds = [
    ...new Set(posts.map((p) => p.userId).filter((id): id is string => id !== null)),
  ];

  const [authorProfiles, emailMap, topicTypes] = await Promise.all([
    authorIds.length > 0
      ? db.select().from(profiles).where(inArray(profiles.id, authorIds))
      : Promise.resolve([] as Profile[]),
    loadUsersEmailMap(authorIds, { adminClient, preloadedUsers: preloadedAuthUsers }),
    db.selectDistinct({ topicType: topicPosts.topicType }).from(topicPosts),
  ]);

  const profileMap = new Map(authorProfiles.map((p) => [p.id, p]));

  return { posts, profileMap, emailMap, topicTypes, currentPage, totalPages };
}

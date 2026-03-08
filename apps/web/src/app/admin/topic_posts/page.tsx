import { getTranslations } from 'next-intl/server';

import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { db, profiles, topicPosts } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

import { DeletePostAdminButton } from '../users/_components/DeletePostAdminButton';

const PAGE_SIZE = 20;

export default async function AdminTopicPostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    user?: string;
    topicType?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const adminClient = createAdminClient();

  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const userFilter = params.user?.trim() || '';
  const topicTypeFilter = params.topicType || '';
  const statusFilter = params.status || '';

  // Build where conditions
  const conditions = [];

  if (topicTypeFilter) {
    conditions.push(eq(topicPosts.topicType, topicTypeFilter));
  }

  if (statusFilter === 'active') {
    conditions.push(isNull(topicPosts.deletedAt));
  } else if (statusFilter === 'deleted') {
    conditions.push(isNotNull(topicPosts.deletedAt));
  }

  // If user filter is set, find matching user IDs from profiles and email
  let filteredUserIds: string[] | null = null;
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
    const { data: usersData } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    const matchingEmailUserIds = (usersData?.users ?? [])
      .filter((u) => u.email?.toLowerCase().includes(userFilter.toLowerCase()))
      .map((u) => u.id);

    const allMatchingIds = [
      ...new Set([...matchingProfiles.map((p) => p.id), ...matchingEmailUserIds]),
    ];

    if (allMatchingIds.length === 0) {
      filteredUserIds = [];
    } else {
      filteredUserIds = allMatchingIds;
      conditions.push(inArray(topicPosts.userId, allMatchingIds));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(topicPosts)
    .where(whereClause);
  const totalCount = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Fetch posts for current page
  const posts =
    filteredUserIds?.length === 0
      ? []
      : await db
          .select()
          .from(topicPosts)
          .where(whereClause)
          .orderBy(desc(topicPosts.createdAt))
          .limit(PAGE_SIZE)
          .offset((currentPage - 1) * PAGE_SIZE);

  // Collect unique user IDs for author lookups
  const authorIds = [...new Set(posts.map((p) => p.userId))];

  // Fetch profiles for authors
  const authorProfiles =
    authorIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, authorIds))
      : [];
  const profileMap = new Map(authorProfiles.map((p) => [p.id, p]));

  // Fetch emails from Supabase Auth
  const emailMap = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: usersData } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    for (const u of usersData?.users ?? []) {
      if (u.email) {
        emailMap.set(u.id, u.email);
      }
    }
  }

  // Fetch distinct topic types for filter dropdown
  const topicTypes = await db.selectDistinct({ topicType: topicPosts.topicType }).from(topicPosts);

  const deleteLabels = {
    deleteButton: t('topicPosts.deleteButton'),
    deleteModalTitle: t('topicPosts.deleteModalTitle'),
    deleteModalReasonLabel: t('topicPosts.deleteModalReasonLabel'),
    deleteModalReasonPlaceholder: t('topicPosts.deleteModalReasonPlaceholder'),
    deleteModalCancel: t('topicPosts.deleteModalCancel'),
    deleteModalConfirm: t('topicPosts.deleteModalConfirm'),
    deleteModalDeleting: t('topicPosts.deleteModalDeleting'),
    deleteModalReasonRequired: t('topicPosts.deleteModalReasonRequired'),
  };

  // Build search params for pagination links
  const buildHref = (page: number) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    if (userFilter) p.set('user', userFilter);
    if (topicTypeFilter) p.set('topicType', topicTypeFilter);
    if (statusFilter) p.set('status', statusFilter);
    return `/admin/topic_posts?${p.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('topicPosts.title')}</h1>

      {/* Filters */}
      <form className="flex gap-4 mb-6 items-end flex-wrap">
        <div>
          <label htmlFor="user-filter" className="block text-sm font-medium mb-1">
            {t('topicPosts.filterByUser')}
          </label>
          <input
            id="user-filter"
            name="user"
            type="text"
            defaultValue={userFilter}
            placeholder="email or username"
            className="border border-border rounded px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label htmlFor="topic-type-filter" className="block text-sm font-medium mb-1">
            {t('topicPosts.filterByTopicType')}
          </label>
          <select
            id="topic-type-filter"
            name="topicType"
            defaultValue={topicTypeFilter}
            className="border border-border rounded px-3 py-2 text-sm bg-background"
          >
            <option value="">{t('topicPosts.allTopicTypes')}</option>
            {topicTypes.map((tt) => (
              <option key={tt.topicType} value={tt.topicType}>
                {tt.topicType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium mb-1">
            {t('topicPosts.filterByStatus')}
          </label>
          <select
            id="status-filter"
            name="status"
            defaultValue={statusFilter}
            className="border border-border rounded px-3 py-2 text-sm bg-background"
          >
            <option value="">{t('topicPosts.allStatuses')}</option>
            <option value="active">{t('topicPosts.active')}</option>
            <option value="deleted">{t('topicPosts.deleted')}</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t('topicPosts.filterButton')}
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('topicPosts.content')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('topicPosts.topicType')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('topicPosts.topicKey')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('topicPosts.author')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('topicPosts.status')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('topicPosts.createdAt')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('topicPosts.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const isDeleted = post.deletedAt != null;
              const authorProfile = profileMap.get(post.userId);
              const authorDisplay =
                authorProfile?.username ?? emailMap.get(post.userId) ?? post.userId;

              return (
                <tr
                  key={post.id}
                  className={`border-t border-border ${isDeleted ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 max-w-md">
                    <span className={isDeleted ? 'line-through' : ''}>
                      {post.content.length > 100
                        ? `${post.content.slice(0, 100)}...`
                        : post.content}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{post.topicType}</td>
                  <td className="px-4 py-3 text-muted-foreground">{post.topicKey}</td>
                  <td className="px-4 py-3">{authorDisplay}</td>
                  <td className="px-4 py-3">
                    {isDeleted ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {t('topicPosts.deleted')}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {t('topicPosts.active')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(post.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {!isDeleted && <DeletePostAdminButton postId={post.id} labels={deleteLabels} />}
                  </td>
                </tr>
              );
            })}
            {posts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {t('topicPosts.noPostsFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} / {totalPages}
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a
                href={buildHref(currentPage - 1)}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
              >
                {t('topicPosts.previousPage')}
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={buildHref(currentPage + 1)}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
              >
                {t('topicPosts.nextPage')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

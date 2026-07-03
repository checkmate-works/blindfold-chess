import { getTranslations } from 'next-intl/server';

import { Button, Field, Input, Select } from '@/app/admin/_components/forms';
import { formatDateTime } from '@/app/admin/_lib/format';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { createAdminClient } from '@/lib/supabase/admin';

import { AdminBadge } from '../_components/AdminBadge';
import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { DeletePostAdminButton } from '../users/_components/DeletePostAdminButton';
import { getAdminTopicPostsPageData } from './_lib/getAdminTopicPostsPageData';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  user: parseAsString.withDefault(''),
  topicType: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
});

export default async function AdminTopicPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    page,
    user: rawUser,
    topicType: topicTypeFilter,
    status: statusFilter,
  } = await searchParamsCache.parse(searchParams);
  const userFilter = rawUser.trim();
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const { posts, profileMap, emailMap, topicTypes, currentPage, totalPages } =
    await getAdminTopicPostsPageData({
      adminClient,
      page,
      userFilter,
      topicTypeFilter,
      statusFilter,
    });

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

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (userFilter) params.set('user', userFilter);
    if (topicTypeFilter) params.set('topicType', topicTypeFilter);
    if (statusFilter) params.set('status', statusFilter);
    return `/admin/topic_posts?${params.toString()}`;
  };

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: t('topicPosts.title') }]} />

      {/* Filters */}
      <form className="flex gap-4 mb-6 items-end flex-wrap">
        <Field label={t('topicPosts.filterByUser')} htmlFor="user-filter">
          <Input
            surface="card"
            fullWidth={false}
            id="user-filter"
            name="user"
            type="text"
            defaultValue={userFilter}
            placeholder="email or username"
          />
        </Field>
        <Field label={t('topicPosts.filterByTopicType')} htmlFor="topic-type-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="topic-type-filter"
            name="topicType"
            defaultValue={topicTypeFilter}
          >
            <option value="">{t('topicPosts.allTopicTypes')}</option>
            {topicTypes.map((tt) => (
              <option key={tt.topicType} value={tt.topicType}>
                {tt.topicType}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('topicPosts.filterByStatus')} htmlFor="status-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="status-filter"
            name="status"
            defaultValue={statusFilter}
          >
            <option value="">{t('topicPosts.allStatuses')}</option>
            <option value="active">{t('topicPosts.active')}</option>
            <option value="deleted">{t('topicPosts.deleted')}</option>
          </Select>
        </Field>
        <Button type="submit" variant="primary">
          {t('topicPosts.filterButton')}
        </Button>
      </form>

      <AdminDataTable
        headers={[
          t('topicPosts.content'),
          t('topicPosts.topicType'),
          t('topicPosts.topicKey'),
          t('topicPosts.author'),
          t('topicPosts.status'),
          t('topicPosts.createdAt'),
          t('topicPosts.actions'),
        ]}
        items={posts}
        emptyMessage={t('topicPosts.noPostsFound')}
        renderRow={(post) => {
          const isDeleted = post.deletedAt != null;
          // Anonymised post (author account purged): user_id is NULL, so there
          // is no profile/email to resolve — show the deleted-user label.
          const authorProfile = post.userId ? profileMap.get(post.userId) : undefined;
          const authorDisplay = post.userId
            ? (authorProfile?.username ?? emailMap.get(post.userId) ?? post.userId)
            : '(deleted user)';

          return (
            <tr key={post.id} className={`border-t border-border ${isDeleted ? 'opacity-50' : ''}`}>
              <td className="px-4 py-3 max-w-md">
                <span className={isDeleted ? 'line-through' : ''}>
                  {post.content.length > 100 ? `${post.content.slice(0, 100)}...` : post.content}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{post.topicType}</td>
              <td className="px-4 py-3 text-muted-foreground">{post.topicKey}</td>
              <td className="px-4 py-3">{authorDisplay}</td>
              <td className="px-4 py-3">
                {isDeleted ? (
                  <AdminBadge variant="danger">{t('topicPosts.deleted')}</AdminBadge>
                ) : (
                  <AdminBadge variant="success">{t('topicPosts.active')}</AdminBadge>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(post.createdAt)}</td>
              <td className="px-4 py-3">
                {!isDeleted && <DeletePostAdminButton postId={post.id} labels={deleteLabels} />}
              </td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

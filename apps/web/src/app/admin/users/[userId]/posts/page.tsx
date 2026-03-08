import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { desc, eq, sql } from 'drizzle-orm';

import { db, profiles, topicPosts } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

import { DeletePostAdminButton } from '../../_components/DeletePostAdminButton';

const PAGE_SIZE = 20;

export default async function AdminUserPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const currentPage = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  // Fetch user profile
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

  if (!profile) {
    notFound();
  }

  // Fetch email from Supabase Auth
  const adminClient = createAdminClient();
  const { data: userData } = await adminClient.auth.admin.getUserById(userId);
  const email = userData?.user?.email ?? '-';

  // Get total count (including deleted posts)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(topicPosts)
    .where(eq(topicPosts.userId, userId));
  const totalCount = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Fetch posts for current page (including deleted)
  const posts = await db
    .select()
    .from(topicPosts)
    .where(eq(topicPosts.userId, userId))
    .orderBy(desc(topicPosts.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const deleteLabels = {
    deleteButton: t('userPosts.deleteButton'),
    deleteModalTitle: t('userPosts.deleteModalTitle'),
    deleteModalReasonLabel: t('userPosts.deleteModalReasonLabel'),
    deleteModalReasonPlaceholder: t('userPosts.deleteModalReasonPlaceholder'),
    deleteModalCancel: t('userPosts.deleteModalCancel'),
    deleteModalConfirm: t('userPosts.deleteModalConfirm'),
    deleteModalDeleting: t('userPosts.deleteModalDeleting'),
    deleteModalReasonRequired: t('userPosts.deleteModalReasonRequired'),
  };

  const buildHref = (page: number) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    return `/admin/users/${userId}/posts?${p.toString()}`;
  };

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
      >
        &larr; {t('userPosts.backToUsers')}
      </Link>

      <h1 className="text-2xl font-bold mb-2">
        {t('userPosts.title', { username: profile.username })}
      </h1>

      <div className="text-sm text-muted-foreground mb-6 space-y-1">
        <p>
          {t('userPosts.username')}: {profile.username}
        </p>
        <p>
          {t('userPosts.email')}: {email}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('userPosts.content')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('userPosts.topic')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('userPosts.createdAt')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('userPosts.status')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('userPosts.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const isDeleted = post.deletedAt != null;

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
                  <td className="px-4 py-3 text-muted-foreground">
                    {post.topicType}/{post.topicKey}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(post.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {isDeleted ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {t('userPosts.deleted')}
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {t('userPosts.active')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!isDeleted && <DeletePostAdminButton postId={post.id} labels={deleteLabels} />}
                  </td>
                </tr>
              );
            })}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('userPosts.noPostsFound')}
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
                {t('userPosts.previousPage')}
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={buildHref(currentPage + 1)}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
              >
                {t('userPosts.nextPage')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

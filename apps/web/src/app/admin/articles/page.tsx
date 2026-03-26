import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { desc, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { articles, db } from '@/lib/db';

import { PaginationNav } from '@/app/[locale]/_components';

import { getPaginationParams } from '@/lib/pagination';

import { AdminDataTable } from '../_components/AdminDataTable';
import { DeleteArticleButton } from './_components/DeleteArticleButton';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(articles);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    Number(countResult.count),
    20
  );

  const items = await db
    .select()
    .from(articles)
    .orderBy(desc(articles.createdAt))
    .limit(limit)
    .offset(offset);

  const buildHref = (p: number) => `/admin/articles?page=${p}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t('newArticle')}
        </Link>
      </div>

      <AdminDataTable
        headers={[
          t('titleColumn'),
          t('locale'),
          t('status'),
          t('pinned'),
          t('publishedAt'),
          t('actions'),
        ]}
        items={items}
        emptyMessage={t('noArticlesFound')}
        renderRow={(item) => (
          <tr key={item.id} className="border-t border-border">
            <td className="px-4 py-3">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.slug}</div>
              </div>
            </td>
            <td className="px-4 py-3 text-muted-foreground">{item.locale}</td>
            <td className="px-4 py-3">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  item.status === 'published'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {item.status === 'published' ? t('published') : t('draft')}
              </span>
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {item.pinnedAt ? t('yes') : t('no')}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '-'}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/articles/${item.id}/edit`}
                  className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  {t('edit')}
                </Link>
                <DeleteArticleButton
                  id={item.id}
                  title={item.title}
                  labels={{
                    deleteButton: t('delete'),
                    modalTitle: t('deleteModalTitle'),
                    modalMessage: t('deleteModalMessage'),
                    cancel: t('deleteModalCancel'),
                    confirm: t('deleteModalConfirm'),
                    deleting: t('deleteModalDeleting'),
                  }}
                />
              </div>
            </td>
          </tr>
        )}
      />

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

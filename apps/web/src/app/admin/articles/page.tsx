import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { articles, db } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';

import { PaginationNav } from '@/app/[locale]/_components';

import { AdminDataTable } from '../_components/AdminDataTable';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type ArticleSlugGroup = {
  slug: string;
  representativeTitle: string;
};

async function getArticleSlugGroups(limit: number, offset: number): Promise<ArticleSlugGroup[]> {
  const rows = await db.execute<{
    slug: string;
    representative_title: string;
  }>(sql`
    SELECT
      ${articles.slug} AS slug,
      (array_agg(${articles.title} ORDER BY
        CASE ${articles.locale} WHEN 'en' THEN 0 ELSE 1 END
      ))[1] AS representative_title
    FROM ${articles}
    GROUP BY ${articles.slug}
    ORDER BY MAX(${articles.createdAt}) DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows.map((row) => ({
    slug: row.slug,
    representativeTitle: row.representative_title,
  }));
}

async function getSlugCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${articles.slug})` })
    .from(articles);
  return Number(result.count);
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.articlesTable' });

  const totalCount = await getSlugCount();
  const { currentPage, totalPages, limit, offset } = getPaginationParams(page, totalCount);
  const groups = await getArticleSlugGroups(limit, offset);

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
        headers={[t('titleColumn'), t('slug'), t('actions')]}
        items={groups}
        emptyMessage={t('noArticlesFound')}
        renderRow={(group) => (
          <tr key={group.slug} className="border-t border-border">
            <td className="px-4 py-3 font-medium">{group.representativeTitle}</td>
            <td className="px-4 py-3 text-muted-foreground">{group.slug}</td>
            <td className="px-4 py-3">
              <Link
                href={`/admin/articles/slug/${group.slug}`}
                className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
              >
                {t('variants')}
              </Link>
            </td>
          </tr>
        )}
      />

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

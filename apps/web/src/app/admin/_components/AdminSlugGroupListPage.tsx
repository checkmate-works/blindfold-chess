import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { sql } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { db } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';

import { AdminDataTable } from './AdminDataTable';
import { AdminNewButton } from './AdminNewButton';
import { AdminPageLayout } from './AdminPageLayout';
import { AdminPaginationNav } from './AdminPaginationNav';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type SlugGroup = {
  slug: string;
  representativeTitle: string;
  firstPublishedAt: string | null;
};

type AdminSlugGroupListPageConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTableWithColumns<any>;
  translationNamespace: string;
  basePath: string;
  newButtonTranslationKey: string;
  emptyMessageKey: string;
  /**
   * When set, a "likes" column (translation key `likes`) shows each slug's
   * total from this loader. Slugs missing from the map render 0.
   */
  loadLikeCounts?: (slugs: string[]) => Promise<Map<string, number>>;
};

export function createAdminSlugGroupListPage(config: AdminSlugGroupListPageConfig) {
  return async function AdminSlugGroupListPage({
    searchParams,
  }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }) {
    const { page } = await searchParamsCache.parse(searchParams);
    const t = await getTranslations({ locale: 'en', namespace: config.translationNamespace });

    const [countResult] = await db.execute<{ count: number }>(sql`
      SELECT COUNT(DISTINCT ${config.table.slug}) AS count FROM ${config.table}
    `);
    const totalCount = Number(countResult?.count ?? 0);

    const { currentPage, totalPages, limit, offset } = getPaginationParams(page, totalCount);

    const rows = await db.execute<{
      slug: string;
      representative_title: string;
      first_published_at: string | null;
    }>(sql`
      SELECT
        ${config.table.slug} AS slug,
        (array_agg(${config.table.title} ORDER BY
          CASE ${config.table.locale} WHEN 'en' THEN 0 ELSE 1 END
        ))[1] AS representative_title,
        ${config.loadLikeCounts ? sql`MIN(${config.table.publishedAt})` : sql`NULL`} AS first_published_at
      FROM ${config.table}
      GROUP BY ${config.table.slug}
      ORDER BY MAX(${config.table.createdAt}) DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const groups: SlugGroup[] = rows.map((row) => ({
      slug: row.slug,
      representativeTitle: row.representative_title,
      firstPublishedAt: row.first_published_at,
    }));

    const likeCounts = config.loadLikeCounts
      ? await config.loadLikeCounts(groups.map((g) => g.slug))
      : null;

    const buildHref = (p: number) => `${config.basePath}?page=${p}`;

    return (
      <AdminPageLayout
        breadcrumbs={[{ label: t('title') }]}
        actions={
          <AdminNewButton
            href={`${config.basePath}/new`}
            label={t(config.newButtonTranslationKey)}
          />
        }
      >
        {likeCounts && <p className="mb-4 text-sm text-muted-foreground">{t('likesHelp')}</p>}
        <AdminDataTable
          headers={[
            t('titleColumn'),
            t('slug'),
            ...(likeCounts ? [t('firstPublished'), t('likes')] : []),
            t('actions'),
          ]}
          items={groups}
          emptyMessage={t(config.emptyMessageKey)}
          renderRow={(group) => (
            <tr key={group.slug} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{group.representativeTitle}</td>
              <td className="px-4 py-3 text-muted-foreground">{group.slug}</td>
              {likeCounts && (
                <>
                  <td className="px-4 py-3 text-muted-foreground">
                    {group.firstPublishedAt
                      ? new Date(group.firstPublishedAt).toISOString().slice(0, 10)
                      : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{likeCounts.get(group.slug) ?? 0}</td>
                </>
              )}
              <td className="px-4 py-3">
                <Link
                  href={`${config.basePath}/slug/${group.slug}`}
                  className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                >
                  {t('variants')}
                </Link>
              </td>
            </tr>
          )}
        />

        <AdminPaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          buildHref={buildHref}
        />
      </AdminPageLayout>
    );
  };
}

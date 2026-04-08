import { ReactNode } from 'react';

import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { desc, sql } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { db } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';

import { PaginationNav } from '@/app/[locale]/_components';

import { AdminDataTable } from './AdminDataTable';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

type AdminListPageConfig<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTableWithColumns<any>;
  translationNamespace: string;
  basePath: string;
  newButtonTranslationKey: string;
  headers: (t: Awaited<ReturnType<typeof getTranslations>>) => ReactNode[];
  emptyMessageKey: string;
  renderRow: (item: T, t: Awaited<ReturnType<typeof getTranslations>>) => ReactNode;
};

export function createAdminListPage<T>(config: AdminListPageConfig<T>) {
  return async function AdminListPage({
    searchParams,
  }: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }) {
    const { page } = await searchParamsCache.parse(searchParams);
    const t = await getTranslations({ locale: 'en', namespace: config.translationNamespace });

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(config.table);
    const { currentPage, totalPages, limit, offset } = getPaginationParams(
      page,
      Number(countResult.count)
    );

    const items = (await db
      .select()
      .from(config.table)
      .orderBy(desc(config.table.createdAt))
      .limit(limit)
      .offset(offset)) as T[];

    const buildHref = (p: number) => `${config.basePath}?page=${p}`;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Link
            href={`${config.basePath}/new`}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t(config.newButtonTranslationKey)}
          </Link>
        </div>

        <AdminDataTable
          headers={config.headers(t)}
          items={items}
          emptyMessage={t(config.emptyMessageKey)}
          renderRow={(item) => config.renderRow(item, t)}
        />

        <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
      </div>
    );
  };
}

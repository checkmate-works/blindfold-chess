/**
 * Admin Achievements Page
 *
 * @description
 * Read-only admin surface for browsing achievement master data. Lists every
 * row in the `achievements` table together with how many `user_achievements`
 * records reference each definition, so admins can quickly see which badges
 * are actively granted.
 *
 * @flow
 * 1. Admin opens /admin/achievements — the page resolves the `page` query
 *    param via nuqs and computes limit/offset via `getPaginationParams`.
 * 2. `countAchievements` + `listAchievementsWithHolderCount` run against the
 *    shared Drizzle client; the latter LEFT JOINs `user_achievements` and
 *    groups by achievement id to return the holder count in a single query.
 * 3. Rows are rendered in `AdminDataTable`; each row links to the detail
 *    page at `/admin/achievements/[id]` for inspecting individual holders.
 */
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { getAchievementDisplayName, getAchievementIconEmoji } from '@/lib/achievements/display';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { countAchievements, listAchievementsWithHolderCount } from './_lib/queries';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  // Root-scoped translator so `getAchievementDisplayName` can resolve
  // full-path keys like `Achievements.monthlyLeaderboard.name`.
  const tRoot = await getTranslations({ locale: 'en' });

  const totalCount = await countAchievements();
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listAchievementsWithHolderCount({ limit, offset });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    return `/admin/achievements?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{t('achievements.title')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('achievements.description')}</p>

      {rows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          {t('achievements.showing', {
            from: (currentPage - 1) * DEFAULT_PAGE_SIZE + 1,
            to: (currentPage - 1) * DEFAULT_PAGE_SIZE + rows.length,
            total: totalCount,
          })}
        </p>
      )}

      <AdminDataTable
        headers={[
          t('achievements.columns.displayName'),
          t('achievements.columns.slug'),
          t('achievements.columns.category'),
          t('achievements.columns.iconKey'),
          t('achievements.columns.repeatable'),
          t('achievements.columns.displayOrder'),
          t('achievements.columns.holderCount'),
          t('achievements.columns.actions'),
        ]}
        items={rows}
        emptyMessage={t('achievements.noAchievementsFound')}
        renderRow={(achievement) => (
          <tr key={achievement.id} className="border-t border-border">
            <td className="px-4 py-3 font-medium">
              <span aria-hidden="true" className="mr-1">
                {getAchievementIconEmoji(achievement.iconKey)}
              </span>
              <span>{getAchievementDisplayName(achievement, tRoot)}</span>
            </td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
              {achievement.slug}
            </td>
            <td className="px-4 py-3">{achievement.category}</td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
              {achievement.iconKey}
            </td>
            <td className="px-4 py-3">
              {achievement.repeatable ? t('achievements.yes') : t('achievements.no')}
            </td>
            <td className="px-4 py-3">{achievement.displayOrder}</td>
            <td className="px-4 py-3">{achievement.holderCount}</td>
            <td className="px-4 py-3">
              <Link
                href={`/admin/achievements/${achievement.id}`}
                className="text-primary hover:underline text-sm"
              >
                {t('achievements.viewHolders')}
              </Link>
            </td>
          </tr>
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

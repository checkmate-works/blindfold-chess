/**
 * Admin Achievement Detail Page
 *
 * @description
 * Read-only admin surface showing a single achievement definition together
 * with a paginated list of the users who currently hold it. The slug is
 * displayed prominently so admins can cross-reference it with seed data and
 * code-side references.
 *
 * @flow
 * 1. Admin navigates to /admin/achievements/[id] from the list page.
 * 2. `getAchievementById` loads the master row; a missing id triggers
 *    `notFound()`.
 * 3. `countAchievementHolders` + `listAchievementHolders` run a paginated
 *    join against `profiles` to render the holders table. Username links to
 *    the public profile page when available; otherwise the raw user id is
 *    shown. Metadata is rendered verbatim as JSON so admins can debug the
 *    grant context for repeatable / monthly badges.
 */
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { adminPageSearchParamsCache } from '@/app/admin/_lib/admin-search-params';

import { getAchievementDisplayName, getAchievementIconEmoji } from '@/lib/achievements/display';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';

import { AdminDataTable } from '../../_components/AdminDataTable';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { AdminPaginationNav } from '../../_components/AdminPaginationNav';
import {
  countAchievementHolders,
  getAchievementById,
  listAchievementHolders,
} from '../_lib/queries';

export default async function AdminAchievementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { page } = await adminPageSearchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  // Root-scoped translator so `getAchievementDisplayName` can resolve
  // full-path keys like `Achievements.monthlyLeaderboard.name`.
  const tRoot = await getTranslations({ locale: 'en' });

  const achievement = await getAchievementById(id);
  if (!achievement) {
    notFound();
  }

  const totalCount = await countAchievementHolders(id);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    totalCount,
    DEFAULT_PAGE_SIZE
  );

  const holders = await listAchievementHolders(id, { limit, offset });

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    return `/admin/achievements/${id}?${params.toString()}`;
  };

  const displayName = getAchievementDisplayName(achievement, tRoot);
  const iconEmoji = getAchievementIconEmoji(achievement.iconKey);

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: t('achievements.navLabel'), href: '/admin/achievements' },
          { label: displayName },
        ]}
        title={
          <>
            <span aria-hidden="true" className="mr-1">
              {iconEmoji}
            </span>
            <span>{displayName}</span>
          </>
        }
      />
      <p className="text-sm font-mono text-muted-foreground mb-6">{achievement.slug}</p>

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          {t('achievements.detail.headerTitle')}
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('achievements.detail.slug')}</dt>
            <dd className="font-mono">{achievement.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('achievements.detail.category')}</dt>
            <dd>{achievement.category}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('achievements.detail.iconKey')}</dt>
            <dd className="font-mono">{achievement.iconKey}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('achievements.detail.repeatable')}</dt>
            <dd>{achievement.repeatable ? t('achievements.yes') : t('achievements.no')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('achievements.detail.displayOrder')}</dt>
            <dd>{achievement.displayOrder}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('achievements.detail.holderCount')}</dt>
            <dd>{totalCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('achievements.detail.createdAt')}</dt>
            <dd>{new Date(achievement.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      <h2 className="text-lg font-semibold mb-3">{t('achievements.detail.holdersTitle')}</h2>

      {holders.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          {t('achievements.detail.showingHolders', {
            from: (currentPage - 1) * DEFAULT_PAGE_SIZE + 1,
            to: (currentPage - 1) * DEFAULT_PAGE_SIZE + holders.length,
            total: totalCount,
          })}
        </p>
      )}

      <AdminDataTable
        headers={[
          t('achievements.detail.columns.username'),
          t('achievements.detail.columns.userId'),
          t('achievements.detail.columns.achievedAt'),
          t('achievements.detail.columns.metadata'),
        ]}
        items={holders}
        emptyMessage={t('achievements.detail.noHoldersFound')}
        renderRow={(holder) => (
          <tr key={holder.id} className="border-t border-border">
            <td className="px-4 py-3">
              {holder.username ? (
                <Link
                  href={`/en/u/${encodeURIComponent(holder.username)}`}
                  className="text-primary hover:underline"
                >
                  @{holder.username}
                </Link>
              ) : (
                <span className="text-muted-foreground italic">
                  {t('achievements.detail.anonymous')}
                </span>
              )}
            </td>
            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{holder.userId}</td>
            <td className="px-4 py-3 text-muted-foreground text-xs">
              {new Date(holder.achievedAt).toLocaleString()}
            </td>
            <td className="px-4 py-3">
              <code className="block max-w-md overflow-x-auto text-xs bg-secondary px-2 py-1 rounded">
                {JSON.stringify(holder.metadata ?? {})}
              </code>
            </td>
          </tr>
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

/**
 * Admin Coins Page (コイン)
 *
 * @description
 * Lets staff issue coin grants and reviews recent admin grants in one
 * paginated table. Companion to /admin/grants (which handles ad_free
 * user_grants); this page writes `point_events` rows in
 * `category='promotional'` so the coins land in the user's spendable
 * balance. "Coin" is the facing name for the points ledger — see the
 * "Points / Coin Economy" note in apps/web/CLAUDE.md.
 *
 * @design Scope of the table
 *
 * Only rows whose `source='admin_grant'` are listed — UGC grants /
 * clawbacks / redemption rows live on the user-facing /mypage/coins
 * history and would only add noise here. Each row shows
 * the recipient (email + username), amount, the moderation reason memo,
 * and the timestamp the grant was issued.
 *
 * @flow
 * 1. Admin opens /admin/coins.
 * 2. Pastes a user UUID, enters amount, optional reason → submits.
 * 3. createPointGrant Server Action writes the ledger row, upserts the
 *    materialized balance, and appends a moderation_actions audit row in
 *    one transaction.
 * 4. The page re-fetches via revalidatePath and the row appears at the
 *    top of the history table below the form.
 */
import { getTranslations } from 'next-intl/server';

import { inArray } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { db, profiles } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { countAdminPointGrants, listAdminPointGrants } from '@/lib/points';
import { createAdminClient } from '@/lib/supabase/admin';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { PointGrantForm } from './_components/PointGrantForm';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminCoinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const total = await countAdminPointGrants();

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    total,
    DEFAULT_PAGE_SIZE
  );

  const grantRows = await listAdminPointGrants(limit, offset);

  const userIds = [...new Set(grantRows.map((g) => g.userId))];
  const userProfiles =
    userIds.length > 0
      ? await db
          .select({ id: profiles.id, username: profiles.username })
          .from(profiles)
          .where(inArray(profiles.id, userIds))
      : [];
  const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

  const adminClient = createAdminClient();
  const emailMap = new Map<string, string>();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await adminClient.auth.admin.getUserById(userId);
      if (data?.user?.email) {
        emailMap.set(userId, data.user.email);
      }
    })
  );

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    return `/admin/coins?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('coins.title')}</h1>

      <div className="mb-8">
        <PointGrantForm />
      </div>

      {grantRows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          {t('coins.showing', {
            from: (currentPage - 1) * DEFAULT_PAGE_SIZE + 1,
            to: (currentPage - 1) * DEFAULT_PAGE_SIZE + grantRows.length,
            total,
          })}
        </p>
      )}

      <AdminDataTable
        headers={[
          t('coins.columns.user'),
          t('coins.columns.amount'),
          t('coins.columns.reason'),
          t('coins.columns.grantedAt'),
        ]}
        items={grantRows}
        emptyMessage={t('coins.empty')}
        renderRow={(grant) => {
          const profile = profileMap.get(grant.userId);
          const email = emailMap.get(grant.userId);
          return (
            <tr key={grant.id} className="border-t border-border">
              <td className="px-4 py-3">
                <div className="text-sm">{email ?? grant.userId}</div>
                {profile?.username && (
                  <div className="text-xs text-muted-foreground">@{profile.username}</div>
                )}
              </td>
              <td className="px-4 py-3 font-mono">+{grant.delta}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-64 truncate">
                {grant.reason ?? '-'}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {new Date(grant.createdAt).toLocaleString()}
              </td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

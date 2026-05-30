/**
 * Admin Coins Page (コイン)
 *
 * @description
 * A cross-user transactions table over the whole `point_events` ledger,
 * filterable by source, category, direction (grant vs spend), and user. This
 * is the "who was granted / who spent what" view — batch grants (like_grant),
 * redemptions, and Maia spends all surface here, not just admin grants.
 *
 * Issuing coins lives on its own focused page (/admin/coins/grant), reached
 * via the "Grant coins" button; this page is read-only over the ledger.
 *
 * "Coin" is the facing name for the points ledger — see the
 * "Points / Coin Economy" note in apps/web/CLAUDE.md. The ledger stays
 * "points" at the schema/service layer.
 *
 * @design Read surface, not a new log
 *
 * `point_events` is already the immutable, idempotent source of truth for
 * every coin movement. This page only reads it; coin movements are NOT
 * duplicated into `moderation_actions` / `user_activity_log` (which would
 * split the source of truth). Admin grant provenance still lands in
 * `moderation_actions` via createPointGrant for the audit log.
 *
 * @flow
 * 1. Admin opens /admin/coins → sees recent ledger rows.
 * 2. Pick filters → the table reloads with matching rows, newest first.
 * 3. "Grant coins" → /admin/coins/grant; on success the new row appears here.
 */
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { inArray } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { db, profiles } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import {
  POINT_CATEGORIES,
  POINT_EVENT_SOURCE_OPTIONS,
  type PointCategory,
  type PointEventFilters,
  countPointEvents,
  listPointEvents,
} from '@/lib/points';
import { createAdminClient } from '@/lib/supabase/admin';
import { UUID_RE } from '@/lib/validations/uuid';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { CoinTransactionFilters } from './_components/CoinTransactionFilters';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  source: parseAsString.withDefault(''),
  category: parseAsString.withDefault(''),
  direction: parseAsString.withDefault(''),
  user: parseAsString.withDefault(''),
});

export default async function AdminCoinsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page, source, category, direction, user } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  // Coin entry kind labels are owned by the user-facing MypagePoints namespace;
  // reuse them so the admin and user surfaces never drift on naming.
  const tKind = await getTranslations({ locale: 'en', namespace: 'MypagePoints.history.kind' });

  // Validate each query param against its known domain. An unknown value is
  // dropped (treated as "no filter") rather than producing an empty table.
  const sourceOptions = new Set<string>(POINT_EVENT_SOURCE_OPTIONS);
  const appliedSource = sourceOptions.has(source) ? source : '';
  const appliedCategory = (POINT_CATEGORIES as readonly string[]).includes(category)
    ? category
    : '';
  const appliedDirection = direction === 'grant' || direction === 'spend' ? direction : '';
  const appliedUser = UUID_RE.test(user) ? user : '';

  const filters: PointEventFilters = {
    source: appliedSource || undefined,
    category: (appliedCategory || undefined) as PointCategory | undefined,
    direction: (appliedDirection || undefined) as 'grant' | 'spend' | undefined,
    userId: appliedUser || undefined,
  };

  const total = await countPointEvents(filters);

  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    total,
    DEFAULT_PAGE_SIZE
  );

  const rows = await listPointEvents(filters, limit, offset);

  const userIds = [...new Set(rows.map((r) => r.userId))];
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

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'earned':
        return t('coins.categoryLabels.earned');
      case 'promotional':
        return t('coins.categoryLabels.promotional');
      case 'purchased':
        return t('coins.categoryLabels.purchased');
      default:
        return cat;
    }
  };

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (appliedSource) params.set('source', appliedSource);
    if (appliedCategory) params.set('category', appliedCategory);
    if (appliedDirection) params.set('direction', appliedDirection);
    if (appliedUser) params.set('user', appliedUser);
    return `/admin/coins?${params.toString()}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('coins.title')}</h1>
        <Link
          href="/admin/coins/grant"
          className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t('coins.grant')}
        </Link>
      </div>

      <div className="mb-4">
        <CoinTransactionFilters
          values={{
            source: appliedSource,
            category: appliedCategory,
            direction: appliedDirection,
            user: appliedUser,
          }}
        />
      </div>

      {rows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          {t('coins.showing', {
            from: (currentPage - 1) * DEFAULT_PAGE_SIZE + 1,
            to: (currentPage - 1) * DEFAULT_PAGE_SIZE + rows.length,
            total,
          })}
        </p>
      )}

      <AdminDataTable
        headers={[
          t('coins.columns.user'),
          t('coins.columns.event'),
          t('coins.columns.amount'),
          t('coins.columns.category'),
          t('coins.columns.source'),
          t('coins.columns.reason'),
          t('coins.columns.date'),
        ]}
        items={rows}
        emptyMessage={t('coins.empty')}
        renderRow={(row) => {
          const profile = profileMap.get(row.userId);
          const email = emailMap.get(row.userId);
          return (
            <tr key={row.id} className="border-t border-border align-top">
              <td className="px-4 py-3">
                <div className="text-sm">{email ?? row.userId}</div>
                {profile?.username && (
                  <div className="text-xs text-muted-foreground">@{profile.username}</div>
                )}
              </td>
              <td className="px-4 py-3">{tKind(row.kind)}</td>
              <td
                className={`px-4 py-3 font-mono ${
                  row.delta >= 0 ? 'text-success-soft-foreground' : 'text-destructive'
                }`}
              >
                {row.delta > 0 ? `+${row.delta}` : row.delta}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{categoryLabel(row.category)}</td>
              <td className="px-4 py-3">
                <code className="text-xs">{row.source}</code>
              </td>
              <td className="px-4 py-3 text-muted-foreground max-w-64 truncate">
                {row.reason ?? '-'}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                {new Date(row.createdAt).toLocaleString()}
              </td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

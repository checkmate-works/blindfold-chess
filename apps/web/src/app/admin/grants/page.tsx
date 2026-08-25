/**
 * Admin Grants Page
 *
 * @description
 * Manages time-limited benefit grants for users. Grants provide benefits
 * such as ad-free access or paywall content access for a specified duration.
 * Currently supports admin manual grants; designed to also support automated
 * triggers (topic post, campaign) and scoped grants (per-article paywall).
 *
 * @design Data model — `user_grants` table
 *
 * A single generic table handles all benefit types and grant sources:
 * - `benefitType`: what benefit is granted ('ad_free', 'paywall_access', ...)
 * - `grantType`: how it was granted ('admin_manual', 'topic_post', 'campaign', ...)
 * - `resourceType` + `resourceId`: NULL for global benefits (ad_free), or
 *   scoped to a specific resource (e.g., article) for paywall access.
 * - `startsAt` + `expiresAt`: time window. Uses additive stacking — new grants
 *   start from the latest existing expiresAt (see `calcGrantStartsAt`).
 * - `revokedAt`: logical deletion (never physically deleted).
 *
 * Ad-free determination in `shouldShowAdsForUser()` (ad.ts) checks both
 * Stripe subscriptions (existing paid plan) and user_grants with
 * benefitType='ad_free'. Either source hides ads.
 *
 * @design Future extensions
 *
 * - Automated grant on topic post: call `calcGrantStartsAt` + insert in the
 *   post creation flow. The race condition note in createGrant.ts applies —
 *   wrap in a transaction for automated (high-frequency) grant types.
 * - Campaign grants: bulk insert for matching users via admin action.
 * - Paywall access: same table, with resourceType='article' + resourceId.
 *   Add a `hasActiveGrant(userId, 'paywall_access')` check or a scoped
 *   variant that also filters by resourceType/resourceId.
 *
 * @flow
 * 1. Admin opens /admin/grants — sees grant form and paginated grant list.
 * 2. Admin pastes a user UUID, selects benefit type, sets duration and reason.
 * 3. createGrant server action calculates additive startsAt and inserts.
 * 4. Active grants can be revoked (sets revokedAt, preserving history).
 * 5. Cache tag 'grant-status' is revalidated on create/revoke.
 */
import { getTranslations } from 'next-intl/server';

import { adminPageSearchParamsCache } from '@/app/admin/_lib/admin-search-params';
import { buildAdminListHref } from '@/app/admin/_lib/build-list-href';
import { formatDate } from '@/app/admin/_lib/format';
import { desc, inArray, sql } from 'drizzle-orm';

import { db, profiles, userGrants } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, getPageRange, getPaginationParams } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';
import type { GrantPeriodStatus } from '@/lib/users/user-grants';
import { classifyGrantPeriod } from '@/lib/users/user-grants';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { BulkGrantForm } from './_components/BulkGrantForm';
import { GrantForm } from './_components/GrantForm';
import { RevokeButton } from './_components/RevokeButton';

type GrantRowStatus = GrantPeriodStatus | 'revoked';

const GRANT_STATUS_CLASS: Record<GrantRowStatus, string> = {
  revoked: 'bg-destructive-soft text-destructive-soft-foreground',
  expired: 'bg-secondary text-muted-foreground',
  upcoming: 'bg-info-soft text-info-soft-foreground',
  active: 'bg-success-soft text-success-soft-foreground',
};

/**
 * Classify a row for the status badge and the revoke gate.
 *
 * The window itself is classified by `classifyGrantPeriod` so this table agrees
 * with `hasActiveGrant` on the boundaries — most visibly, a grant stacked onto
 * an existing one starts in the future and grants nothing yet, so it must read
 * as `upcoming` here rather than as `active`. Revocation outranks the window: a
 * revoked grant reads as revoked whether or not its period had already elapsed.
 */
function getGrantRowStatus(
  grant: { revokedAt: Date | null; startsAt: Date; expiresAt: Date },
  now: Date
): GrantRowStatus {
  return grant.revokedAt
    ? 'revoked'
    : classifyGrantPeriod(now, new Date(grant.startsAt), new Date(grant.expiresAt));
}

export default async function AdminGrantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await adminPageSearchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  // Get total count
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(userGrants);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    countResult?.count ?? 0,
    DEFAULT_PAGE_SIZE
  );

  // Fetch paginated grants
  const grantRows = await db
    .select()
    .from(userGrants)
    .orderBy(desc(userGrants.createdAt))
    .limit(limit)
    .offset(offset);

  // Look up profiles for usernames
  const userIds = [...new Set(grantRows.map((g) => g.userId))];
  const userProfiles =
    userIds.length > 0 ? await db.select().from(profiles).where(inArray(profiles.id, userIds)) : [];
  const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

  // Look up auth users for emails
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

  const buildHref = buildAdminListHref('/admin/grants');

  // One instant for the whole table, so two rows on the same boundary cannot
  // disagree about where "now" falls.
  const now = new Date();

  const statusLabel = (status: GrantRowStatus) => {
    switch (status) {
      case 'active':
        return t('grants.status.active');
      case 'upcoming':
        return t('grants.status.upcoming');
      case 'expired':
        return t('grants.status.expired');
      case 'revoked':
        return t('grants.status.revoked');
    }
  };

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: t('grants.title') }]} />

      <div className="mb-8">
        <GrantForm />
      </div>

      <div className="mb-8">
        <BulkGrantForm />
      </div>

      {grantRows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          {t('grants.showing', {
            ...getPageRange(currentPage, DEFAULT_PAGE_SIZE, grantRows.length),
            total: countResult?.count ?? 0,
          })}
        </p>
      )}

      <AdminDataTable
        headers={[
          t('grants.columns.user'),
          t('grants.columns.benefit'),
          t('grants.columns.grantType'),
          t('grants.columns.reason'),
          t('grants.columns.period'),
          t('grants.columns.status'),
          t('grants.columns.actions'),
        ]}
        items={grantRows}
        emptyMessage={t('grants.noGrantsFound')}
        renderRow={(grant) => {
          const profile = profileMap.get(grant.userId);
          const email = emailMap.get(grant.userId);
          const status = getGrantRowStatus(grant, now);

          return (
            <tr key={grant.id} className="border-t border-border">
              <td className="px-4 py-3">
                <div className="text-sm">{email ?? grant.userId}</div>
                {profile?.username && (
                  <div className="text-xs text-muted-foreground">@{profile.username}</div>
                )}
              </td>
              <td className="px-4 py-3">{grant.benefitType}</td>
              <td className="px-4 py-3">{grant.grantType}</td>
              <td className="px-4 py-3 text-muted-foreground max-w-48 truncate">
                {grant.reason ?? '-'}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">
                <div>{formatDate(grant.startsAt)}</div>
                <div>~ {formatDate(grant.expiresAt)}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${GRANT_STATUS_CLASS[status]}`}
                >
                  {statusLabel(status)}
                </span>
              </td>
              <td className="px-4 py-3">
                {status === 'active' && <RevokeButton grantId={grant.id} />}
              </td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

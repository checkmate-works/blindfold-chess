/**
 * Admin Grants Page (権限付与管理)
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

import { desc, inArray, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';

import { db, profiles, userGrants } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, getPaginationParams } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { BulkGrantForm } from './_components/BulkGrantForm';
import { GrantForm } from './_components/GrantForm';
import { RevokeButton } from './_components/RevokeButton';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

function getGrantStatus(
  grant: { revokedAt: Date | null; expiresAt: Date },
  t: (key: string) => string
): {
  label: string;
  className: string;
} {
  if (grant.revokedAt) {
    return {
      label: t('grants.status.revoked'),
      className: 'bg-destructive-soft text-destructive-soft-foreground',
    };
  }
  if (new Date(grant.expiresAt) < new Date()) {
    return {
      label: t('grants.status.expired'),
      className: 'bg-secondary text-muted-foreground',
    };
  }
  return {
    label: t('grants.status.active'),
    className: 'bg-success-soft text-success-soft-foreground',
  };
}

export default async function AdminGrantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
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

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    return `/admin/grants?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('grants.title')}</h1>

      <div className="mb-8">
        <GrantForm />
      </div>

      <div className="mb-8">
        <BulkGrantForm />
      </div>

      {grantRows.length > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          {t('grants.showing', {
            from: (currentPage - 1) * DEFAULT_PAGE_SIZE + 1,
            to: (currentPage - 1) * DEFAULT_PAGE_SIZE + grantRows.length,
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
          const status = getGrantStatus(grant, t);
          const isActive = !grant.revokedAt && new Date(grant.expiresAt) >= new Date();

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
                <div>{new Date(grant.startsAt).toLocaleDateString()}</div>
                <div>~ {new Date(grant.expiresAt).toLocaleDateString()}</div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>
              </td>
              <td className="px-4 py-3">{isActive && <RevokeButton grantId={grant.id} />}</td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

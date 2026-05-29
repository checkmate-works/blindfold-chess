/**
 * Admin User Detail (ユーザー詳細)
 *
 * @description
 * Per-user admin view. Consolidates everything that used to crowd the user
 * list's "Actions" column — cross-links to posts / activity / subscriptions,
 * ban/unban — plus richer per-user data (role, rank history, subscriptions,
 * moderation history) that has no room in the list. Reached via the "Details"
 * link in the list's ID column.
 */
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa';

import { BENEFIT_ACTIVE_STATUSES } from '@/lib/billing/subscription-constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { AdminDataTable } from '../../_components/AdminDataTable';
import { BanButton } from '../_components/BanButton';
import { CopyUserIdButton } from '../_components/CopyUserIdButton';
import { StatusBadge } from '../_components/StatusBadge';
import { UnbanButton } from '../_components/UnbanButton';
import { getSignupMethod } from '../_lib/queries';
import { DetailSection } from './_components/DetailSection';
import { InfoRow } from './_components/InfoRow';
import { fetchUserDetail } from './_lib/queries';

const SIGNUP_METHOD_LABEL_KEY = {
  google: 'providerGoogle',
  email: 'providerEmail',
  unknown: 'providerUnknown',
} as const;

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const adminClient = createAdminClient();
  const detail = await fetchUserDetail(adminClient, id);
  if (!detail) {
    notFound();
  }

  const {
    authUser,
    profile,
    role,
    subscriptions,
    moderationEntries,
    ranks,
    currentRank,
    banReason,
  } = detail;

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const isCurrentUser = currentUser?.id === authUser.id;

  const isDeleted = profile?.deletedAt != null;
  const isBanned = profile?.bannedAt != null;
  const isPremium = subscriptions.some((s) =>
    (BENEFIT_ACTIVE_STATUSES as readonly string[]).includes(s.status)
  );
  const signupMethod = getSignupMethod(authUser);

  const formatDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString() : '—';
  const formatDateTime = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleString() : '—';

  const rankName = (slug: string) => t(`stats.rankNames.${slug}`);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <FaArrowLeft className="h-3 w-3" />
        {t('usersTable.detail.backToList')}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{profile?.username ?? authUser.email ?? authUser.id}</h1>
        <StatusBadge
          profile={profile}
          banReason={banReason}
          labels={{
            anonymous: t('usersTable.anonymous'),
            deleted: t('usersTable.deleted'),
            banned: t('usersTable.banned'),
            active: t('usersTable.active'),
          }}
        />
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
            isPremium
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-secondary text-foreground'
          }`}
        >
          {isPremium ? t('usersTable.premium') : t('usersTable.free')}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title={t('usersTable.detail.basicInfo')}>
          <dl>
            <InfoRow label={t('usersTable.detail.accountId')}>
              <span className="inline-flex items-center gap-2">
                <code className="text-xs">{authUser.id}</code>
                <CopyUserIdButton
                  userId={authUser.id}
                  labels={{
                    copyUserId: t('usersTable.copyUserId'),
                    copyUserIdSuccess: t('usersTable.copyUserIdSuccess'),
                  }}
                />
              </span>
            </InfoRow>
            <InfoRow label={t('usersTable.email')}>{authUser.email ?? '—'}</InfoRow>
            <InfoRow label={t('usersTable.username')}>
              {profile?.username ? (
                <Link
                  href={`/en/u/${encodeURIComponent(profile.username)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {profile.username}
                  <FaExternalLinkAlt className="h-3 w-3" />
                </Link>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow label={t('usersTable.detail.country')}>{profile?.country ?? '—'}</InfoRow>
            <InfoRow label={t('usersTable.detail.role')}>
              {role ?? t('usersTable.defaultRole')}
            </InfoRow>
            <InfoRow label={t('usersTable.signupMethod')}>
              {t(`usersTable.${SIGNUP_METHOD_LABEL_KEY[signupMethod]}`)}
            </InfoRow>
            <InfoRow label={t('usersTable.createdAt')}>{formatDate(authUser.created_at)}</InfoRow>
          </dl>
        </DetailSection>

        <DetailSection title={t('usersTable.detail.rankSection')}>
          <dl>
            <InfoRow label={t('usersTable.detail.currentRank')}>
              {currentRank ? rankName(currentRank.slug) : t('usersTable.detail.noRank')}
            </InfoRow>
          </dl>
          {ranks.length > 0 && (
            <ul className="mt-3 space-y-1">
              {ranks.map((rank) => (
                <li
                  key={rank.slug}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <span className="text-foreground">{rankName(rank.slug)}</span>
                  <span>{formatDate(rank.achievedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection title={t('usersTable.detail.subscriptionsSection')}>
          <AdminDataTable
            headers={[
              t('usersTable.detail.subStatus'),
              t('usersTable.detail.subPriceId'),
              t('usersTable.detail.subPeriod'),
              t('usersTable.detail.subCancelAt'),
            ]}
            items={subscriptions}
            emptyMessage={t('usersTable.detail.noSubscriptions')}
            renderRow={(sub) => (
              <tr key={sub.id} className="border-t border-border">
                <td className="px-4 py-3">{sub.status}</td>
                <td className="px-4 py-3">
                  <code className="text-xs">{sub.stripePriceId}</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(sub.currentPeriodStart)} – {formatDate(sub.currentPeriodEnd)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(sub.cancelAt)}</td>
              </tr>
            )}
          />
        </DetailSection>

        <DetailSection title={t('usersTable.detail.moderationSection')}>
          <AdminDataTable
            headers={[
              t('usersTable.detail.modAction'),
              t('usersTable.detail.modReason'),
              t('usersTable.detail.modActor'),
              t('usersTable.detail.modDate'),
            ]}
            items={moderationEntries}
            emptyMessage={t('usersTable.detail.noModerationActions')}
            renderRow={(entry) => (
              <tr key={entry.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-medium">{entry.action}</td>
                <td className="px-4 py-3 text-muted-foreground">{entry.reason ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground break-all">
                  {entry.actorEmail ?? entry.actorId}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </td>
              </tr>
            )}
          />
        </DetailSection>
      </div>

      <DetailSection title={t('usersTable.detail.adminActions')}>
        <div className="flex flex-wrap items-center gap-2">
          {profile && (
            <>
              <Link
                href={`/admin/topic_posts?user=${encodeURIComponent(profile.username ?? authUser.email ?? authUser.id)}`}
                className="rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {t('usersTable.viewPosts')}
              </Link>
              <Link
                href={`/admin/activity-log?user=${encodeURIComponent(profile.username ?? '')}`}
                className="rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {t('usersTable.viewActivity')}
              </Link>
              <Link
                href={`/admin/subscriptions?user=${authUser.id}`}
                className="rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {t('usersTable.viewSubscriptions')}
              </Link>
            </>
          )}
          {!isCurrentUser && !isDeleted && profile && (
            <>
              {isBanned ? <UnbanButton userId={authUser.id} /> : <BanButton userId={authUser.id} />}
            </>
          )}
        </div>
      </DetailSection>
    </div>
  );
}

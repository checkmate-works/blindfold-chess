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

import { formatDate, formatDateTime } from '@/app/admin/_lib/format';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { BENEFIT_ACTIVE_STATUSES } from '@/lib/billing/subscription-constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { AdminDataTable } from '../../_components/AdminDataTable';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
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
  // The coin (points-ledger) entry kind labels are owned by the user-facing
  // MypagePoints namespace; reuse them here so admin and user surfaces never
  // drift on what e.g. `like_grant` is called.
  const tKind = await getTranslations({ locale: 'en', namespace: 'MypagePoints.history.kind' });

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
    coinBalance,
    coinHistory,
  } = detail;

  const coinCategoryLabel = (category: string) => {
    switch (category) {
      case 'earned':
        return t('usersTable.detail.coinCatEarned');
      case 'promotional':
        return t('usersTable.detail.coinCatPromotional');
      case 'purchased':
        return t('usersTable.detail.coinCatPurchased');
      default:
        return category;
    }
  };

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

  const rankName = (slug: string) => t(`stats.rankNames.${slug}`);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[
          { label: t('users'), href: '/admin/users' },
          { label: profile?.username ?? authUser.email ?? authUser.id },
        ]}
        actions={
          <>
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
          </>
        }
      />

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

      <DetailSection title={t('usersTable.detail.coinSection')}>
        <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <span className="text-xs text-muted-foreground">
              {t('usersTable.detail.coinBalanceLabel')}
            </span>
            <div className="text-2xl font-semibold">
              {coinBalance.total}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {t('usersTable.detail.coinUnit')}
              </span>
            </div>
          </div>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <dt>{t('usersTable.detail.coinCatEarned')}:</dt>
              <dd className="font-mono text-foreground">{coinBalance.byCategory.earned}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t('usersTable.detail.coinCatPromotional')}:</dt>
              <dd className="font-mono text-foreground">{coinBalance.byCategory.promotional}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t('usersTable.detail.coinCatPurchased')}:</dt>
              <dd className="font-mono text-foreground">{coinBalance.byCategory.purchased}</dd>
            </div>
          </dl>
        </div>

        <p className="mb-2 text-sm font-medium">{t('usersTable.detail.coinHistoryTitle')}</p>
        <AdminDataTable
          headers={[
            t('usersTable.detail.coinDate'),
            t('usersTable.detail.coinEvent'),
            t('usersTable.detail.coinAmount'),
            t('usersTable.detail.coinCategory'),
          ]}
          items={coinHistory}
          emptyMessage={t('usersTable.detail.noCoinActivity')}
          renderRow={(entry) => (
            <tr key={entry.id} className="border-t border-border">
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </td>
              <td className="px-4 py-3">{tKind(entry.kind)}</td>
              <td
                className={`px-4 py-3 font-mono ${
                  entry.delta >= 0 ? 'text-success-soft-foreground' : 'text-destructive'
                }`}
              >
                {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {coinCategoryLabel(entry.category)}
              </td>
            </tr>
          )}
        />

        <div className="mt-3">
          <Link
            href={`/admin/coins?user=${authUser.id}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {t('usersTable.detail.viewAllCoins')}
            <FaExternalLinkAlt className="h-3 w-3" />
          </Link>
        </div>
      </DetailSection>

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

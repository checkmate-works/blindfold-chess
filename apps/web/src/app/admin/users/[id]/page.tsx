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

import { MaskedEmail } from '@/app/admin/_components/MaskedEmail';
import { formatDate, formatDateTime } from '@/app/admin/_lib/format';

import { getOptionalUser } from '@/lib/auth';
import { isSubscriptionActive } from '@/lib/billing/subscription-constants';
import { ALL_RANK_SLUGS, isMukyuSlug } from '@/lib/db/data/ranks';
import { createAdminClient } from '@/lib/supabase/admin';

import { AdminDataTable } from '../../_components/AdminDataTable';
import { AdminExternalLink } from '../../_components/AdminExternalLink';
import { AdminPageLayout } from '../../_components/AdminPageLayout';
import { AdminUserLink } from '../../_components/AdminUserLink';
import { BanButton } from '../_components/BanButton';
import { CopyUserIdButton } from '../_components/CopyUserIdButton';
import { StatusBadge } from '../_components/StatusBadge';
import { UnbanButton } from '../_components/UnbanButton';
import { getSignupMethod } from '../_lib/queries';
import { SIGNUP_METHOD_I18N_KEY } from '../_lib/signup-method';
import { DetailSection } from './_components/DetailSection';
import { GrantRankButton } from './_components/GrantRankButton';
import { InfoRow } from './_components/InfoRow';
import { fetchUserDetail } from './_lib/queries';

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

  const currentUser = await getOptionalUser();
  const isCurrentUser = currentUser?.id === authUser.id;

  const isDeleted = profile?.deletedAt != null;
  const isBanned = profile?.bannedAt != null;
  const isPremium = subscriptions.some((s) => isSubscriptionActive(s));
  const signupMethod = getSignupMethod(authUser);

  // Admin.stats.rankNames.<RankSlug>: Admin.stats.rankNames.mukyu, Admin.stats.rankNames.5kyu, Admin.stats.rankNames.4kyu, Admin.stats.rankNames.3kyu, Admin.stats.rankNames.2kyu, Admin.stats.rankNames.1kyu, Admin.stats.rankNames.1dan (ALL_RANK_SLUGS; callers pass achieved ranks and the non-mukyu remainder)
  const rankName = (slug: string) => t(`stats.rankNames.${slug}`);
  const achievedSlugs = new Set(ranks.map((r) => r.slug));
  const availableRanks = ALL_RANK_SLUGS.filter(
    (slug) => !isMukyuSlug(slug) && !achievedSlugs.has(slug)
  ).map((slug) => ({ slug, label: rankName(slug) }));

  return (
    <AdminPageLayout
      breadcrumbs={[
        { label: t('users'), href: '/admin/users' },
        { label: profile?.username ?? authUser.id },
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
      contentClassName="space-y-6"
    >
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
            <InfoRow label={t('usersTable.email')}>
              <MaskedEmail
                email={authUser.email}
                labels={{
                  revealEmail: t('usersTable.revealEmail'),
                  hideEmail: t('usersTable.hideEmail'),
                }}
                fallback="—"
              />
            </InfoRow>
            <InfoRow label={t('usersTable.username')}>
              {profile?.username ? (
                <AdminExternalLink path={`/u/${encodeURIComponent(profile.username)}`}>
                  {profile.username}
                </AdminExternalLink>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow label={t('usersTable.detail.country')}>{profile?.country ?? '—'}</InfoRow>
            <InfoRow label={t('usersTable.detail.role')}>
              {role ?? t('usersTable.defaultRole')}
            </InfoRow>
            <InfoRow label={t('usersTable.signupMethod')}>
              {/* Admin.usersTable.<SIGNUP_METHOD_I18N_KEY[SignupMethod]>: Admin.usersTable.providerGoogle, Admin.usersTable.providerEmail, Admin.usersTable.providerUnknown (SIGNUP_METHOD_ORDER) */}
              {t(`usersTable.${SIGNUP_METHOD_I18N_KEY[signupMethod]}`)}
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
          {!isDeleted && profile && (
            <div className="mt-3">
              <GrantRankButton userId={authUser.id} availableRanks={availableRanks} />
            </div>
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
                <td className="px-4 py-3">
                  <AdminUserLink
                    userId={entry.actorId}
                    username={entry.actorUsername}
                    deletedLabel={t('deletedUser')}
                    provisionalLabel={t('provisionalUser')}
                  />
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
                href={`/admin/topic_posts?user=${encodeURIComponent(profile.username)}`}
                className="rounded border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {t('usersTable.viewPosts')}
              </Link>
              <Link
                href={`/admin/activity-log?user=${encodeURIComponent(profile.username)}`}
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
    </AdminPageLayout>
  );
}

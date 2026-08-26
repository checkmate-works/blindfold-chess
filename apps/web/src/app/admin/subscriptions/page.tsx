import { getTranslations } from 'next-intl/server';

import { buildAdminListHref } from '@/app/admin/_lib/build-list-href';
import { formatDate } from '@/app/admin/_lib/format';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { db, profiles, subscriptions } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';

import { AdminBadge, type AdminBadgeVariant } from '../_components/AdminBadge';
import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPageLayout } from '../_components/AdminPageLayout';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { AdminUserLink } from '../_components/AdminUserLink';
import { SubscriptionStatusFilter } from './_components/SubscriptionStatusFilter';
import { UserCombobox } from './_components/UserCombobox';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  status: parseAsString.withDefault(''),
  user: parseAsString.withDefault(''),
});

function statusBadgeVariant(status: string): AdminBadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'past_due':
      return 'warning';
    case 'canceled':
    case 'unpaid':
      return 'danger';
    default:
      return 'neutral';
  }
}

function truncateId(id: string, maxLength = 16): string {
  if (id.length <= maxLength) return id;
  return `${id.slice(0, maxLength)}...`;
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    page,
    status: statusFilter,
    user: userFilter,
  } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  // Build where clause
  const conditions = [];
  if (statusFilter) conditions.push(eq(subscriptions.status, statusFilter));
  if (userFilter) conditions.push(eq(subscriptions.userId, userFilter));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(whereClause);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    countResult?.count ?? 0,
    20
  );

  // Fetch paginated subscriptions
  const subscriptionRows = await db
    .select()
    .from(subscriptions)
    .where(whereClause)
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .offset(offset);

  // Look up profiles for usernames
  const userIds = subscriptionRows.map((s) => s.userId);
  const userProfiles =
    userIds.length > 0 ? await db.select().from(profiles).where(inArray(profiles.id, userIds)) : [];
  const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

  // Ensure filtered user's profile is available for the combobox
  if (userFilter && !profileMap.has(userFilter)) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userFilter)).limit(1);
    if (profile) profileMap.set(profile.id, profile);
  }

  const filteredUserProfile = userFilter ? profileMap.get(userFilter) : null;
  const initialUser = userFilter
    ? {
        id: userFilter,
        username: filteredUserProfile?.username ?? userFilter,
      }
    : null;

  const buildHref = buildAdminListHref('/admin/subscriptions', {
    status: statusFilter,
    user: userFilter,
  });

  return (
    <AdminPageLayout breadcrumbs={[{ label: t('subscriptionsTable.title') }]}>
      <div className="mb-6 flex gap-4">
        <UserCombobox
          initialUser={initialUser}
          currentStatus={statusFilter}
          labels={{
            searchUser: t('subscriptionsTable.searchUser'),
            noResults: t('subscriptionsTable.noResults'),
            clearFilter: t('subscriptionsTable.clearFilter'),
          }}
        />
        <SubscriptionStatusFilter
          labels={{
            filterByStatus: t('subscriptionsTable.filterByStatus'),
            allStatuses: t('subscriptionsTable.allStatuses'),
            active: t('subscriptionsTable.active'),
            trialing: t('subscriptionsTable.trialing'),
            pastDue: t('subscriptionsTable.pastDue'),
            canceled: t('subscriptionsTable.canceled'),
            unpaid: t('subscriptionsTable.unpaid'),
          }}
        />
      </div>

      <AdminDataTable
        headers={[
          t('subscriptionsTable.username'),
          t('subscriptionsTable.subscriptionId'),
          t('subscriptionsTable.priceId'),
          t('subscriptionsTable.status'),
          t('subscriptionsTable.cancelAt'),
          t('subscriptionsTable.periodStart'),
          t('subscriptionsTable.periodEnd'),
          t('subscriptionsTable.createdAt'),
        ]}
        items={subscriptionRows}
        emptyMessage={t('subscriptionsTable.noSubscriptionsFound')}
        renderRow={(sub) => {
          const profile = profileMap.get(sub.userId);

          return (
            <tr key={sub.id} className="border-t border-border">
              <td className="px-4 py-3">
                <AdminUserLink
                  userId={sub.userId}
                  username={profile?.username}
                  deletedLabel={t('deletedUser')}
                />
              </td>
              <td className="px-4 py-3 font-mono text-xs" title={sub.stripeSubscriptionId}>
                {truncateId(sub.stripeSubscriptionId)}
              </td>
              <td className="px-4 py-3 font-mono text-xs" title={sub.stripePriceId}>
                {truncateId(sub.stripePriceId)}
              </td>
              <td className="px-4 py-3">
                <AdminBadge variant={statusBadgeVariant(sub.status)}>{sub.status}</AdminBadge>
              </td>
              <td className="px-4 py-3">{formatDate(sub.cancelAt)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(sub.currentPeriodStart)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(sub.currentPeriodEnd)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(sub.createdAt)}</td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </AdminPageLayout>
  );
}

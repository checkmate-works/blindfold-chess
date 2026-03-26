import { getTranslations } from 'next-intl/server';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { db, profiles, subscriptions } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';

import { PaginationNav } from '@/app/[locale]/_components';

import { AdminDataTable } from '../_components/AdminDataTable';
import { SubscriptionStatusFilter } from './_components/SubscriptionStatusFilter';
import { UserCombobox } from './_components/UserCombobox';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  status: parseAsString.withDefault(''),
  user: parseAsString.withDefault(''),
});

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-success-soft text-success-soft-foreground';
    case 'trialing':
      return 'bg-info-soft text-info-soft-foreground';
    case 'past_due':
      return 'bg-warning-soft text-warning-soft-foreground';
    case 'canceled':
    case 'unpaid':
      return 'bg-destructive-soft text-destructive-soft-foreground';
    default:
      return 'bg-secondary text-foreground';
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

  // Look up auth users for emails (only for the current page's users)
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

  // Ensure filtered user's email is available even if they have no subscriptions
  if (userFilter && !emailMap.has(userFilter)) {
    const { data } = await adminClient.auth.admin.getUserById(userFilter);
    if (data?.user?.email) {
      emailMap.set(userFilter, data.user.email);
    }
  }

  // Ensure filtered user's profile is available for the combobox
  if (userFilter && !profileMap.has(userFilter)) {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userFilter)).limit(1);
    if (profile) profileMap.set(profile.id, profile);
  }

  const filteredUserProfile = userFilter ? profileMap.get(userFilter) : null;
  const initialUser = userFilter
    ? {
        id: userFilter,
        username: filteredUserProfile?.username ?? emailMap.get(userFilter) ?? userFilter,
      }
    : null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (statusFilter) params.set('status', statusFilter);
    if (userFilter) params.set('user', userFilter);
    return `/admin/subscriptions?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('subscriptionsTable.title')}</h1>

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
          t('subscriptionsTable.user'),
          t('subscriptionsTable.username'),
          t('subscriptionsTable.subscriptionId'),
          t('subscriptionsTable.priceId'),
          t('subscriptionsTable.status'),
          t('subscriptionsTable.cancelAtPeriodEnd'),
          t('subscriptionsTable.periodStart'),
          t('subscriptionsTable.periodEnd'),
          t('subscriptionsTable.createdAt'),
        ]}
        items={subscriptionRows}
        emptyMessage={t('subscriptionsTable.noSubscriptionsFound')}
        renderRow={(sub) => {
          const profile = profileMap.get(sub.userId);
          const email = emailMap.get(sub.userId);

          return (
            <tr key={sub.id} className="border-t border-border">
              <td className="px-4 py-3">{email ?? sub.userId}</td>
              <td className="px-4 py-3">{profile?.username ?? '-'}</td>
              <td className="px-4 py-3 font-mono text-xs" title={sub.stripeSubscriptionId}>
                {truncateId(sub.stripeSubscriptionId)}
              </td>
              <td className="px-4 py-3 font-mono text-xs" title={sub.stripePriceId}>
                {truncateId(sub.stripePriceId)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(sub.status)}`}
                >
                  {sub.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {sub.cancelAtPeriodEnd ? t('subscriptionsTable.yes') : t('subscriptionsTable.no')}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(sub.currentPeriodStart).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(sub.createdAt).toLocaleDateString()}
              </td>
            </tr>
          );
        }}
      />

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { CountryBarChart } from './_components/CountryBarChart';
import { StatusFilter } from './_components/StatusFilter';
import { UserRow } from './_components/UserRow';
import { UsersTabNav } from './_components/UsersTabNav';
import { fetchCountryStats, fetchUsersPageData } from './_lib/queries';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  status: parseAsString.withDefault(''),
  tab: parseAsString.withDefault('list'),
});

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page, status: statusFilter, tab: rawTab } = await searchParamsCache.parse(searchParams);
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const validTabs = ['list', 'stats'] as const;
  const tab = validTabs.includes(rawTab as (typeof validTabs)[number]) ? rawTab : 'list';

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const tabs = [
    { id: 'list', label: t('tabs.users') },
    { id: 'stats', label: t('tabs.statistics') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('users')}</h1>

      <div className="mb-6">
        <StatusFilter
          labels={{
            filterByStatus: t('usersTable.filterByStatus'),
            allStatuses: t('usersTable.allStatuses'),
            active: t('usersTable.active'),
            banned: t('usersTable.banned'),
            anonymous: t('usersTable.anonymous'),
            deleted: t('usersTable.deleted'),
          }}
        />
      </div>

      <div className="mb-6">
        <UsersTabNav tabs={tabs} />
      </div>

      {tab === 'list' ? (
        <UsersListContent
          adminClient={adminClient}
          page={page}
          statusFilter={statusFilter}
          currentUser={currentUser}
          t={t}
        />
      ) : (
        <StatsContent adminClient={adminClient} statusFilter={statusFilter} t={t} />
      )}
    </div>
  );
}

async function UsersListContent({
  adminClient,
  page,
  statusFilter,
  currentUser,
  t,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  page: number;
  statusFilter: string;
  currentUser: { id: string } | null | undefined;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const {
    users,
    currentPage,
    totalPages,
    totalCount,
    profileMap,
    roleMap,
    subscriptionMap,
    banReasonMap,
  } = await fetchUsersPageData(adminClient, page, statusFilter);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    params.set('tab', 'list');
    if (statusFilter) params.set('status', statusFilter);
    return `/admin/users?${params.toString()}`;
  };

  const rowLabels = {
    defaultRole: t('usersTable.defaultRole'),
    premium: t('usersTable.premium'),
    free: t('usersTable.free'),
    anonymous: t('usersTable.anonymous'),
    deleted: t('usersTable.deleted'),
    banned: t('usersTable.banned'),
    active: t('usersTable.active'),
    viewPosts: t('usersTable.viewPosts'),
    viewActivity: t('usersTable.viewActivity'),
    viewSubscriptions: t('usersTable.viewSubscriptions'),
  };

  return (
    <>
      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}&ndash;
          {(currentPage - 1) * DEFAULT_PAGE_SIZE + users.length} of {totalCount} users
        </p>
      )}

      <AdminDataTable
        headers={[
          t('usersTable.email'),
          t('usersTable.username'),
          t('usersTable.role'),
          t('usersTable.plan'),
          t('usersTable.status'),
          t('usersTable.createdAt'),
          t('usersTable.actions'),
        ]}
        items={users}
        emptyMessage={t('usersTable.noUsersFound')}
        renderRow={(user) => (
          <UserRow
            key={user.id}
            user={user}
            profile={profileMap.get(user.id)}
            role={roleMap.get(user.id)}
            hasSubscription={subscriptionMap.has(user.id)}
            banReason={banReasonMap.get(user.id) ?? null}
            isCurrentUser={currentUser?.id === user.id}
            labels={rowLabels}
          />
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}

async function StatsContent({
  adminClient,
  statusFilter,
  t,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  statusFilter: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const countryStats = await fetchCountryStats(adminClient, statusFilter);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">{t('stats.usersByCountry')}</h2>
      <CountryBarChart
        data={countryStats}
        labels={{
          noData: t('stats.noData'),
          users: t('stats.users'),
        }}
      />
    </div>
  );
}

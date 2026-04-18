/**
 * Admin Users Management
 *
 * @description
 * Admin page for viewing and managing user accounts. Provides both a paginated
 * user list with status filtering and a statistics view with country and rank
 * distribution charts. Supports filtering by status, country, and rank with
 * cross-tab chart-click navigation.
 *
 * @flow
 * 1. Admin navigates to /admin/users — sees the user list tab by default.
 * 2. Admin can filter by status (active/banned/anonymous/deleted) — applies to
 *    both list and stats tabs.
 * 3. Switching to the "Statistics" tab shows:
 *    - Users by Country — horizontal bar chart of user distribution by country.
 *    - Users by Rank — horizontal bar chart of user distribution by belt rank,
 *      including unranked (mukyu) users and Coming Soon ranks with 0 count.
 * 4. Clicking a bar in a chart sets the corresponding filter (country or rank)
 *    and navigates to the List tab with the filter applied.
 * 5. Active filters are displayed as dismissible badges above the user list.
 *    Each badge can be individually removed, or all filters cleared at once.
 */
import { getTranslations } from 'next-intl/server';

import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { ActiveFilters } from './_components/ActiveFilters';
import { CountryBarChart } from './_components/CountryBarChart';
import { ProviderFilter } from './_components/ProviderFilter';
import { RankBarChart } from './_components/RankBarChart';
import { SignupMethodChart } from './_components/SignupMethodChart';
import { StatsChartNav } from './_components/StatsChartNav';
import { StatusFilter } from './_components/StatusFilter';
import { UserRow } from './_components/UserRow';
import { UsernameFilter } from './_components/UsernameFilter';
import { UsersTabNav } from './_components/UsersTabNav';
import { type AdminUserFilters, buildAdminUsersHref } from './_lib/filters';
import {
  fetchCountryStats,
  fetchRankStats,
  fetchSignupMethodStats,
  fetchUsersPageData,
  getSignupMethod,
} from './_lib/queries';
import { SIGNUP_METHOD_ORDER } from './_lib/signup-method';

// Whitelist for the `provider` URL param. Includes '' (= no filter / default).
// Anything outside this list falls back to '' (filter cleared).
const PROVIDER_FILTER_VALUES = ['', ...SIGNUP_METHOD_ORDER] as const;

// Map `SignupMethod` ('google' | 'email' | 'unknown') to the corresponding
// `Admin.usersTable.provider*` i18n key suffix, so label maps can be derived
// from `SIGNUP_METHOD_ORDER` without hard-coding each method in 3+ places.
const PROVIDER_I18N_KEY: Record<(typeof SIGNUP_METHOD_ORDER)[number], string> = {
  google: 'providerGoogle',
  email: 'providerEmail',
  unknown: 'providerUnknown',
};

function buildProviderNames(
  t: Awaited<ReturnType<typeof getTranslations>>
): Record<(typeof SIGNUP_METHOD_ORDER)[number], string> {
  return Object.fromEntries(
    SIGNUP_METHOD_ORDER.map((method) => [method, t(`usersTable.${PROVIDER_I18N_KEY[method]}`)])
  ) as Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;
}

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  status: parseAsString.withDefault(''),
  tab: parseAsString.withDefault('list'),
  country: parseAsString.withDefault(''),
  rank: parseAsString.withDefault(''),
  provider: parseAsStringLiteral(PROVIDER_FILTER_VALUES).withDefault(''),
  username: parseAsString.withDefault(''),
});

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    page,
    status: statusFilter,
    tab: rawTab,
    country: countryFilter,
    rank: rankFilter,
    provider: providerFilter,
    username: usernameFilter,
  } = await searchParamsCache.parse(searchParams);
  const filters: AdminUserFilters = {
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter,
    usernameFilter,
  };
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const providerNames = buildProviderNames(t);

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

      <UsernameFilter
        labels={{
          searchByUsername: t('usersTable.searchByUsername'),
          searchButton: t('usersTable.searchButton'),
        }}
      />

      <div className="mb-6 flex flex-wrap gap-4">
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
        <ProviderFilter
          labels={{
            filterByProvider: t('usersTable.filterByProvider'),
            allProviders: t('usersTable.allProviders'),
          }}
          providerNames={providerNames}
        />
      </div>

      <div className="mb-6">
        <UsersTabNav tabs={tabs} />
      </div>

      {tab === 'list' ? (
        <UsersListContent
          adminClient={adminClient}
          page={page}
          filters={filters}
          providerNames={providerNames}
          currentUser={currentUser}
          t={t}
        />
      ) : (
        <StatsContent
          adminClient={adminClient}
          filters={filters}
          providerNames={providerNames}
          t={t}
        />
      )}
    </div>
  );
}

async function UsersListContent({
  adminClient,
  page,
  filters,
  providerNames,
  currentUser,
  t,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  page: number;
  filters: AdminUserFilters;
  providerNames: Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;
  currentUser: { id: string } | null | undefined;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const { statusFilter, countryFilter, rankFilter, providerFilter, usernameFilter } = filters;
  const {
    users,
    currentPage,
    totalPages,
    totalCount,
    profileMap,
    roleMap,
    subscriptionMap,
    banReasonMap,
  } = await fetchUsersPageData(
    adminClient,
    page,
    statusFilter,
    countryFilter,
    rankFilter,
    providerFilter,
    usernameFilter
  );

  const buildHref = (p: number) => buildAdminUsersHref(filters, p);

  const rankNames: Record<string, string> = {};
  for (const slug of ALL_RANK_SLUGS) {
    rankNames[slug] = t(`stats.rankNames.${slug}`);
  }

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
    copyUserId: t('usersTable.copyUserId'),
    copyUserIdSuccess: t('usersTable.copyUserIdSuccess'),
    ...providerNames,
  };

  return (
    <>
      <ActiveFilters
        statusFilter={statusFilter}
        countryFilter={countryFilter}
        rankFilter={rankFilter}
        providerFilter={providerFilter}
        usernameFilter={usernameFilter}
        rankNames={rankNames}
        providerNames={providerNames}
        labels={{
          clearAll: t('filters.clearAll'),
          active: t('usersTable.active'),
          banned: t('usersTable.banned'),
          anonymous: t('usersTable.anonymous'),
          deleted: t('usersTable.deleted'),
          usernameLabel: t('usersTable.usernameLabel'),
        }}
      />

      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {(currentPage - 1) * DEFAULT_PAGE_SIZE + 1}&ndash;
          {(currentPage - 1) * DEFAULT_PAGE_SIZE + users.length} of {totalCount} users
        </p>
      )}

      <AdminDataTable
        headers={[
          t('usersTable.columnId'),
          t('usersTable.email'),
          t('usersTable.username'),
          t('usersTable.role'),
          t('usersTable.plan'),
          t('usersTable.status'),
          t('usersTable.signupMethod'),
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
            signupMethod={getSignupMethod(user)}
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
  filters,
  providerNames,
  t,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  filters: AdminUserFilters;
  providerNames: Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const { statusFilter, countryFilter, rankFilter, providerFilter, usernameFilter } = filters;
  const [countryStats, rankStats, signupMethodStats] = await Promise.all([
    fetchCountryStats(
      adminClient,
      statusFilter,
      countryFilter,
      rankFilter,
      providerFilter,
      usernameFilter
    ),
    fetchRankStats(
      adminClient,
      statusFilter,
      countryFilter,
      rankFilter,
      providerFilter,
      usernameFilter
    ),
    fetchSignupMethodStats(
      adminClient,
      statusFilter,
      countryFilter,
      rankFilter,
      providerFilter,
      usernameFilter
    ),
  ]);

  const rankNames: Record<string, string> = {};
  for (const slug of ALL_RANK_SLUGS) {
    rankNames[slug] = t(`stats.rankNames.${slug}`);
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('stats.usersByCountry')}</h2>
        <StatsChartNav type="country">
          <CountryBarChart
            data={countryStats}
            labels={{
              noData: t('stats.noData'),
              users: t('stats.users'),
            }}
          />
        </StatsChartNav>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('stats.usersByRank')}</h2>
        <StatsChartNav type="rank">
          <RankBarChart
            data={rankStats}
            labels={{
              noData: t('stats.noData'),
              users: t('stats.users'),
            }}
            rankNames={rankNames}
          />
        </StatsChartNav>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('stats.usersBySignupMethod')}</h2>
        <StatsChartNav type="provider">
          <SignupMethodChart
            data={signupMethodStats}
            labels={{
              noData: t('stats.noData'),
              users: t('stats.users'),
            }}
            methodNames={providerNames}
          />
        </StatsChartNav>
      </div>
    </div>
  );
}

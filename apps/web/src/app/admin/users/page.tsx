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

import { createAdminClient } from '@/lib/supabase/admin';

import { ProviderFilter } from './_components/ProviderFilter';
import { StatsTab } from './_components/StatsTab';
import { StatusFilter } from './_components/StatusFilter';
import { UsernameFilter } from './_components/UsernameFilter';
import { UsersListTab } from './_components/UsersListTab';
import { UsersTabNav } from './_components/UsersTabNav';
import type { AdminUserFilters } from './_lib/filters';
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

  const tabs = [
    { id: 'list', label: t('tabs.users') },
    { id: 'stats', label: t('tabs.statistics') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('users')}</h1>

      <UsernameFilter
        labels={{
          searchByUsernameOrEmail: t('usersTable.searchByUsernameOrEmail'),
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
        <UsersListTab
          adminClient={adminClient}
          page={page}
          filters={filters}
          providerNames={providerNames}
          t={t}
        />
      ) : (
        <StatsTab adminClient={adminClient} filters={filters} providerNames={providerNames} t={t} />
      )}
    </div>
  );
}

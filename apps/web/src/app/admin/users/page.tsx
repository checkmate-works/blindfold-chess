/**
 * Admin Users Management
 *
 * @description
 * Admin page for viewing and managing user accounts: a paginated user list
 * with status, signup-method, country, rank, level and username filters.
 * Distribution charts live on the sibling page `/admin/users/stats`, which
 * links back here with a filter applied when a bar is clicked.
 *
 * @flow
 * 1. Admin navigates to /admin/users — sees the paginated user list.
 * 2. Admin can filter by status (active/banned/anonymous/deleted), signup
 *    method, or search by username / email.
 * 3. Country, rank and level filters are set by clicking a bar on the
 *    statistics page (or a country flag in the list).
 * 4. Active filters are displayed as dismissible badges above the user list.
 *    Each badge can be individually removed, or all filters cleared at once.
 */
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  createSearchParamsCache,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server';

import { createAdminClient } from '@/lib/supabase/admin';

import { AdminPageLayout } from '../_components/AdminPageLayout';
import { ProviderFilter } from './_components/ProviderFilter';
import { StatusFilter } from './_components/StatusFilter';
import { UsernameFilter } from './_components/UsernameFilter';
import { UsersListTab } from './_components/UsersListTab';
import type { AdminUserFilters } from './_lib/filters';
import { PROVIDER_FILTER_VALUES, buildProviderNames } from './_lib/provider-filter';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  status: parseAsString.withDefault(''),
  // Legacy: the statistics used to be a tab on this page. Only read to
  // redirect old links to the stats page.
  tab: parseAsString.withDefault(''),
  country: parseAsString.withDefault(''),
  rank: parseAsString.withDefault(''),
  level: parseAsString.withDefault(''),
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
    tab,
    country: countryFilter,
    rank: rankFilter,
    level: levelFilter,
    provider: providerFilter,
    username: usernameFilter,
  } = await searchParamsCache.parse(searchParams);

  if (tab === 'stats') {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (providerFilter) params.set('provider', providerFilter);
    const query = params.toString();
    redirect(query ? `/admin/users/stats?${query}` : '/admin/users/stats');
  }

  const filters: AdminUserFilters = {
    statusFilter,
    countryFilter,
    rankFilter,
    levelFilter,
    providerFilter,
    usernameFilter,
  };
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const providerNames = buildProviderNames(t);

  return (
    <AdminPageLayout
      breadcrumbs={[{ label: t('users') }]}
      actions={
        <Link
          href="/admin/users/stats"
          className="inline-flex items-center rounded border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {t('userStats')}
        </Link>
      }
    >
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

      <UsersListTab
        adminClient={adminClient}
        page={page}
        filters={filters}
        providerNames={providerNames}
        t={t}
      />
    </AdminPageLayout>
  );
}

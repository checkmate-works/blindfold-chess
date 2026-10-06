/**
 * Admin User Statistics
 *
 * @description
 * Distribution charts over the user population: by country, by belt rank, by
 * Exp level band, and by signup method. Split out of `/admin/users` so the
 * list page is a list and this page is a report; the two stay linked in both
 * directions (header action on the list, bar clicks here open the filtered
 * list).
 *
 * @flow
 * 1. Admin opens /admin/users/stats — all four charts render for the whole
 *    population.
 * 2. The status and signup-method filters narrow the population every chart
 *    is computed from (e.g. exclude incomplete registrations).
 * 3. Clicking a bar opens /admin/users filtered to that bar's bucket, with
 *    the status / signup-method filters carried along.
 * 4. Legacy links to /admin/users?tab=stats redirect here.
 */
import { getTranslations } from 'next-intl/server';

import { createSearchParamsCache, parseAsString, parseAsStringLiteral } from 'nuqs/server';

import { createAdminClient } from '@/lib/supabase/admin';

import { AdminPageLayout } from '../../_components/AdminPageLayout';
import { ProviderFilter } from '../_components/ProviderFilter';
import { StatusFilter } from '../_components/StatusFilter';
import { UserStatsCharts } from '../_components/UserStatsCharts';
import { type AdminUserFilters, EMPTY_ADMIN_USER_FILTERS } from '../_lib/filters';
import { PROVIDER_FILTER_VALUES, buildProviderNames } from '../_lib/provider-filter';

const searchParamsCache = createSearchParamsCache({
  status: parseAsString.withDefault(''),
  provider: parseAsStringLiteral(PROVIDER_FILTER_VALUES).withDefault(''),
});

export default async function AdminUserStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { status: statusFilter, provider: providerFilter } =
    await searchParamsCache.parse(searchParams);
  const filters: AdminUserFilters = {
    ...EMPTY_ADMIN_USER_FILTERS,
    statusFilter,
    providerFilter,
  };
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const providerNames = buildProviderNames(t);

  return (
    <AdminPageLayout
      breadcrumbs={[{ label: t('users'), href: '/admin/users' }, { label: t('userStats') }]}
    >
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

      <UserStatsCharts
        adminClient={adminClient}
        filters={filters}
        providerNames={providerNames}
        t={t}
      />
    </AdminPageLayout>
  );
}

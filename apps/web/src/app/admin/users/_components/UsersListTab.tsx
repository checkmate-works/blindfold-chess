import type { getTranslations } from 'next-intl/server';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';
import { DEFAULT_PAGE_SIZE, getPageRange } from '@/lib/pagination';
import type { createAdminClient } from '@/lib/supabase/admin';

import { AdminDataTable } from '../../_components/AdminDataTable';
import { AdminPaginationNav } from '../../_components/AdminPaginationNav';
import { type AdminUserFilters, buildAdminUsersHref } from '../_lib/filters';
import { fetchUsersPageData, getSignupMethod } from '../_lib/queries';
import type { SIGNUP_METHOD_ORDER } from '../_lib/signup-method';
import { ActiveFilters } from './ActiveFilters';
import { UserRow } from './UserRow';

type Translator = Awaited<ReturnType<typeof getTranslations>>;
type AdminClient = ReturnType<typeof createAdminClient>;
type ProviderNames = Record<(typeof SIGNUP_METHOD_ORDER)[number], string>;

/**
 * Server-rendered "Users" tab. Owns the page-data fetch, the active-
 * filters strip, the result count line, the data table, and pagination.
 * Lifted out of the page so the tab dispatch in `page.tsx` reads as
 * a thin "load → render which tab" composition.
 */
export async function UsersListTab({
  adminClient,
  page,
  filters,
  providerNames,
  t,
}: {
  adminClient: AdminClient;
  page: number;
  filters: AdminUserFilters;
  providerNames: ProviderNames;
  t: Translator;
}) {
  const { statusFilter, countryFilter, rankFilter, providerFilter, usernameFilter } = filters;
  const { users, currentPage, totalPages, totalCount, profileMap, subscriptionMap, banReasonMap } =
    await fetchUsersPageData(adminClient, page, filters);

  const buildHref = (p: number) => buildAdminUsersHref(filters, p);
  const pageRange = getPageRange(currentPage, DEFAULT_PAGE_SIZE, users.length);

  const rankNames: Record<string, string> = {};
  for (const slug of ALL_RANK_SLUGS) {
    rankNames[slug] = t(`stats.rankNames.${slug}`);
  }

  const rowLabels = {
    premium: t('usersTable.premium'),
    free: t('usersTable.free'),
    anonymous: t('usersTable.anonymous'),
    deleted: t('usersTable.deleted'),
    banned: t('usersTable.banned'),
    active: t('usersTable.active'),
    viewDetail: t('usersTable.viewDetail'),
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
          usernameOrEmailLabel: t('usersTable.usernameOrEmailLabel'),
        }}
      />

      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground mb-2">
          Showing {pageRange.from}&ndash;{pageRange.to} of {totalCount} users
        </p>
      )}

      <AdminDataTable
        headers={[
          t('usersTable.columnId'),
          t('usersTable.email'),
          t('usersTable.username'),
          t('usersTable.plan'),
          t('usersTable.status'),
          t('usersTable.signupMethod'),
          t('usersTable.createdAt'),
          t('usersTable.viewDetail'),
        ]}
        items={users}
        emptyMessage={t('usersTable.noUsersFound')}
        renderRow={(user) => (
          <UserRow
            key={user.id}
            user={user}
            profile={profileMap.get(user.id)}
            hasSubscription={subscriptionMap.has(user.id)}
            banReason={banReasonMap.get(user.id) ?? null}
            signupMethod={getSignupMethod(user)}
            labels={rowLabels}
          />
        )}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </>
  );
}

import { getTranslations } from 'next-intl/server';

import { buildAdminListHref } from '@/app/admin/_lib/build-list-href';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { createAdminClient } from '@/lib/supabase/admin';

import { ActionUserFilterForm } from '../_components/ActionUserFilterForm';
import { AdminPageLayout } from '../_components/AdminPageLayout';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { ActivityLogRow } from './_components/ActivityLogRow';
import { fetchActivityLogPageData } from './_lib/queries';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  action: parseAsString.withDefault(''),
  user: parseAsString.withDefault(''),
});

export default async function AdminActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page, action: actionFilter, user: rawUser } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const adminClient = createAdminClient();
  const userFilter = rawUser.trim();

  const { logs, currentPage, totalPages, profileMap, purgedUserIds, targetLinks, actionTypes } =
    await fetchActivityLogPageData(adminClient, page, actionFilter, userFilter);

  const buildHref = buildAdminListHref('/admin/activity-log', {
    action: actionFilter,
    user: userFilter,
  });

  return (
    <AdminPageLayout breadcrumbs={[{ label: t('activityLog') }]}>
      <ActionUserFilterForm
        labels={{
          filterByAction: t('activityLogTable.filterByAction'),
          allActions: t('activityLogTable.allActions'),
          filterByUser: t('activityLogTable.filterByUser'),
        }}
        actionOptions={actionTypes.map((at) => at.action)}
        actionFilter={actionFilter}
        userFilter={userFilter}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.action')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.username')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.target')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.metadata')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.timestamp')}</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {logs.map((log) => (
              <ActivityLogRow
                key={log.id}
                log={log}
                profileMap={profileMap}
                userLabels={{ deleted: t('deletedUser'), provisional: t('provisionalUser') }}
                purgedUserIds={purgedUserIds}
                targetLinks={targetLinks}
              />
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('activityLogTable.noLogsFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </AdminPageLayout>
  );
}

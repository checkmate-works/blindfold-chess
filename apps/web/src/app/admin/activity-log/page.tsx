import { getTranslations } from 'next-intl/server';

import { Button, Field, Input, Select } from '@/app/admin/_components/forms';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { createAdminClient } from '@/lib/supabase/admin';

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

  const { logs, currentPage, totalPages, profileMap, emailMap, actionTypes } =
    await fetchActivityLogPageData(adminClient, page, actionFilter, userFilter);

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (actionFilter) params.set('action', actionFilter);
    if (userFilter) params.set('user', userFilter);
    return `/admin/activity-log?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('activityLog')}</h1>

      {/* Filters */}
      <form className="flex gap-4 mb-6 items-end">
        <Field label={t('activityLogTable.filterByAction')} htmlFor="action-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="action-filter"
            name="action"
            defaultValue={actionFilter}
          >
            <option value="">{t('activityLogTable.allActions')}</option>
            {actionTypes.map((at) => (
              <option key={at.action} value={at.action}>
                {at.action}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('activityLogTable.filterByUser')} htmlFor="user-filter">
          <Input
            surface="card"
            fullWidth={false}
            id="user-filter"
            name="user"
            type="text"
            defaultValue={userFilter}
            placeholder="email or username"
          />
        </Field>
        <Button type="submit" variant="primary">
          Filter
        </Button>
      </form>

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
              <ActivityLogRow key={log.id} log={log} profileMap={profileMap} emailMap={emailMap} />
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
    </div>
  );
}

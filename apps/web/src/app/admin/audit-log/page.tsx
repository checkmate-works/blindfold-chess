import { getTranslations } from 'next-intl/server';

import { Button, Field, Input, Select } from '@/app/admin/_components/forms';
import { buildAdminListHref } from '@/app/admin/_lib/build-list-href';
import { formatDateTime } from '@/app/admin/_lib/format';
import { resolveUserFilter } from '@/app/admin/_lib/resolve-user-filter';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { db, moderationActions, profiles } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';

import { AdminBadge, type AdminBadgeVariant } from '../_components/AdminBadge';
import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPageHeader } from '../_components/AdminPageHeader';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { AdminUserLink } from '../_components/AdminUserLink';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  action: parseAsString.withDefault(''),
  user: parseAsString.withDefault(''),
});

function actionBadgeVariant(action: string): AdminBadgeVariant {
  switch (action) {
    case 'ban':
      return 'danger';
    case 'unban':
    case 'create_grant':
    case 'create_point_grant':
    case 'feature_puzzle':
      return 'success';
    case 'delete_post':
    case 'delete_position':
    case 'revoke_grant':
    case 'unfeature_puzzle':
      return 'caution';
    default:
      return 'neutral';
  }
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page, action: actionFilter, user: rawUser } = await searchParamsCache.parse(searchParams);
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const adminClient = createAdminClient();

  const userFilter = rawUser.trim();

  // Build where conditions
  const conditions = [];
  if (actionFilter) {
    conditions.push(eq(moderationActions.action, actionFilter));
  }

  // If user filter is set, find matching target IDs from profiles
  let filteredTargetIds: string[] | null = null;
  if (userFilter) {
    const resolved = await resolveUserFilter(adminClient, userFilter);
    filteredTargetIds = resolved.matchingIds;
    if (resolved.matchingIds.length > 0) {
      conditions.push(inArray(moderationActions.targetId, resolved.matchingIds));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(moderationActions)
    .where(whereClause);
  const { currentPage, totalPages, limit, offset } = getPaginationParams(
    page,
    Number(countResult.count)
  );

  // Fetch logs for current page
  const logs =
    filteredTargetIds?.length === 0
      ? []
      : await db
          .select()
          .from(moderationActions)
          .where(whereClause)
          .orderBy(desc(moderationActions.createdAt))
          .limit(limit)
          .offset(offset);

  // Collect unique user IDs for target and actor lookups
  const targetIds = [...new Set(logs.map((l) => l.targetId))];
  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const allUserIds = [...new Set([...targetIds, ...actorIds])];

  // Fetch profiles for targets and for the acting admins alike — both
  // columns render a username.
  const rowProfiles =
    allUserIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, allUserIds))
      : [];
  const profileMap = new Map(rowProfiles.map((p) => [p.id, p]));

  // Build search params for pagination links
  const buildHref = buildAdminListHref('/admin/audit-log', {
    action: actionFilter,
    user: userFilter,
  });

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: t('auditLog') }]} />

      {/* Filters */}
      <form className="flex gap-4 mb-6 items-end">
        <Field label={t('auditLogTable.filterByAction')} htmlFor="action-filter">
          <Select
            surface="card"
            fullWidth={false}
            id="action-filter"
            name="action"
            defaultValue={actionFilter}
          >
            <option value="">{t('auditLogTable.allActions')}</option>
            <option value="ban">ban</option>
            <option value="unban">unban</option>
            <option value="delete_post">delete_post</option>
            <option value="delete_position">delete_position</option>
            <option value="feature_puzzle">feature_puzzle</option>
            <option value="unfeature_puzzle">unfeature_puzzle</option>
            <option value="create_grant">create_grant</option>
            <option value="revoke_grant">revoke_grant</option>
            <option value="create_point_grant">create_point_grant</option>
          </Select>
        </Field>
        <Field label={t('auditLogTable.filterByUser')} htmlFor="user-filter">
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

      <AdminDataTable
        headers={[
          t('auditLogTable.action'),
          t('auditLogTable.target'),
          t('auditLogTable.actor'),
          t('auditLogTable.reason'),
          t('auditLogTable.ipAddress'),
          t('auditLogTable.timestamp'),
        ]}
        items={logs}
        emptyMessage={t('auditLogTable.noLogsFound')}
        renderRow={(log) => {
          return (
            <tr key={log.id} className="border-t border-border">
              <td className="px-4 py-3">
                <AdminBadge variant={actionBadgeVariant(log.action)}>{log.action}</AdminBadge>
              </td>
              <td className="px-4 py-3">
                <AdminUserLink
                  userId={log.targetId}
                  username={profileMap.get(log.targetId)?.username}
                  deletedLabel={t('deletedUser')}
                />
              </td>
              <td className="px-4 py-3">
                <AdminUserLink
                  userId={log.actorId}
                  username={profileMap.get(log.actorId)?.username}
                  deletedLabel={t('deletedUser')}
                />
              </td>
              <td className="px-4 py-3">
                {log.reason ? (
                  <span title={log.reason}>
                    {log.reason.length > 50 ? `${log.reason.slice(0, 50)}...` : log.reason}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{log.ipAddress ?? '-'}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

import { getTranslations } from 'next-intl/server';

import { buildAdminListHref } from '@/app/admin/_lib/build-list-href';
import { findPurgedUserIds } from '@/app/admin/_lib/find-purged-user-ids';
import { formatDateTime } from '@/app/admin/_lib/format';
import { resolveUserFilter } from '@/app/admin/_lib/resolve-user-filter';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { truncateContent } from '@/lib/content/truncate-content';
import { db, moderationActions, profiles } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';

import { ActionUserFilterForm } from '../_components/ActionUserFilterForm';
import { AdminBadge, type AdminBadgeVariant } from '../_components/AdminBadge';
import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPageLayout } from '../_components/AdminPageLayout';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';
import { AdminUserLink } from '../_components/AdminUserLink';

/** Characters of the raw id shown for a target that is not a person. */
const ID_PREFIX_LENGTH = 8;

/** Reason budget for the table cell; the full text stays in the `title`. */
const REASON_CELL_LENGTH = 50;

/** The moderation actions the filter offers, in display order. */
const FILTERABLE_ACTIONS = [
  'ban',
  'unban',
  'delete_post',
  'delete_position',
  'feature_puzzle',
  'unfeature_puzzle',
  'create_grant',
  'revoke_grant',
  'create_point_grant',
] as const;

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

  // Collect unique user IDs for target and actor lookups. `target_id` is
  // polymorphic — a ban names a user, a delete names the post or chunk it
  // removed — so only the `user` rows belong in a profile lookup.
  const targetUserIds = [
    ...new Set(logs.filter((l) => l.targetType === 'user').map((l) => l.targetId)),
  ];
  const actorIds = [...new Set(logs.map((l) => l.actorId))];
  const allUserIds = [...new Set([...targetUserIds, ...actorIds])];

  // Fetch profiles for targets and for the acting admins alike — both
  // columns render a username.
  const rowProfiles =
    allUserIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, allUserIds))
      : [];
  const profileMap = new Map(rowProfiles.map((p) => [p.id, p]));

  // An actor is FK-bound to `auth.users` and so always exists; a target is
  // not, and a moderated user who has since been purged would otherwise read
  // as one who never finished registering. Ask auth about the targets that
  // named no profile — on a normal page, none of them.
  const purgedUserIds = await findPurgedUserIds(
    adminClient,
    targetUserIds.filter((id) => !profileMap.has(id))
  );

  // Build search params for pagination links
  const buildHref = buildAdminListHref('/admin/audit-log', {
    action: actionFilter,
    user: userFilter,
  });

  return (
    <AdminPageLayout breadcrumbs={[{ label: t('auditLog') }]}>
      <ActionUserFilterForm
        labels={{
          filterByAction: t('auditLogTable.filterByAction'),
          allActions: t('auditLogTable.allActions'),
          filterByUser: t('auditLogTable.filterByUser'),
        }}
        actionOptions={FILTERABLE_ACTIONS}
        actionFilter={actionFilter}
        userFilter={userFilter}
      />

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
                {log.targetType === 'user' ? (
                  <AdminUserLink
                    userId={log.targetId}
                    username={profileMap.get(log.targetId)?.username}
                    deletedLabel={t('deletedUser')}
                    provisionalLabel={t('provisionalUser')}
                    accountExists={!purgedUserIds.has(log.targetId)}
                  />
                ) : (
                  <span className="text-xs" title={log.targetId}>
                    <span className="text-muted-foreground mr-1">[{log.targetType}]</span>
                    {`${log.targetId.slice(0, ID_PREFIX_LENGTH)}…`}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <AdminUserLink
                  userId={log.actorId}
                  username={profileMap.get(log.actorId)?.username}
                  deletedLabel={t('deletedUser')}
                  provisionalLabel={t('provisionalUser')}
                />
              </td>
              <td className="px-4 py-3">
                {log.reason ? (
                  <span title={log.reason}>{truncateContent(log.reason, REASON_CELL_LENGTH)}</span>
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
    </AdminPageLayout>
  );
}

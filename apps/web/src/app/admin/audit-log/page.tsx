import { getTranslations } from 'next-intl/server';

import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { db, moderationActions, profiles } from '@/lib/db';
import { getPaginationParams } from '@/lib/pagination';
import { createAdminClient } from '@/lib/supabase/admin';

import { AdminDataTable } from '../_components/AdminDataTable';
import { AdminPaginationNav } from '../_components/AdminPaginationNav';

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  action: parseAsString.withDefault(''),
  user: parseAsString.withDefault(''),
});

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
    const matchingProfiles = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        or(
          ilike(profiles.username, `%${userFilter}%`),
          ilike(profiles.displayName, `%${userFilter}%`)
        )
      );

    // Also search by email via Supabase admin client
    const { data: usersData } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    const matchingEmailUserIds = (usersData?.users ?? [])
      .filter((u) => u.email?.toLowerCase().includes(userFilter.toLowerCase()))
      .map((u) => u.id);

    const allMatchingIds = [
      ...new Set([...matchingProfiles.map((p) => p.id), ...matchingEmailUserIds]),
    ];

    if (allMatchingIds.length === 0) {
      // No matching users — return empty result
      filteredTargetIds = [];
    } else {
      filteredTargetIds = allMatchingIds;
      conditions.push(inArray(moderationActions.targetId, allMatchingIds));
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

  // Fetch profiles for targets
  const targetProfiles =
    targetIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, targetIds))
      : [];
  const profileMap = new Map(targetProfiles.map((p) => [p.id, p]));

  // Fetch emails from Supabase Auth for all users
  const emailMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const { data: usersData } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    for (const u of usersData?.users ?? []) {
      if (u.email) {
        emailMap.set(u.id, u.email);
      }
    }
  }

  // Build search params for pagination links
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (actionFilter) params.set('action', actionFilter);
    if (userFilter) params.set('user', userFilter);
    return `/admin/audit-log?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('auditLog')}</h1>

      {/* Filters */}
      <form className="flex gap-4 mb-6 items-end">
        <div>
          <label htmlFor="action-filter" className="block text-sm font-medium mb-1">
            {t('auditLogTable.filterByAction')}
          </label>
          <select
            id="action-filter"
            name="action"
            defaultValue={actionFilter}
            className="border border-border rounded px-3 py-2 text-sm bg-card"
          >
            <option value="">{t('auditLogTable.allActions')}</option>
            <option value="ban">ban</option>
            <option value="unban">unban</option>
            <option value="delete_post">delete_post</option>
            <option value="delete_position">delete_position</option>
          </select>
        </div>
        <div>
          <label htmlFor="user-filter" className="block text-sm font-medium mb-1">
            {t('auditLogTable.filterByUser')}
          </label>
          <input
            id="user-filter"
            name="user"
            type="text"
            defaultValue={userFilter}
            placeholder="email or username"
            className="border border-border rounded px-3 py-2 text-sm bg-card"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Filter
        </button>
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
          const targetProfile = profileMap.get(log.targetId);
          const targetDisplay =
            targetProfile?.username ?? emailMap.get(log.targetId) ?? log.targetId;
          const actorDisplay = emailMap.get(log.actorId) ?? log.actorId;

          return (
            <tr key={log.id} className="border-t border-border">
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    log.action === 'ban'
                      ? 'bg-destructive-soft text-destructive-soft-foreground'
                      : log.action === 'unban'
                        ? 'bg-success-soft text-success-soft-foreground'
                        : log.action === 'delete_post' || log.action === 'delete_position'
                          ? 'bg-caution-soft text-caution-soft-foreground'
                          : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {log.action}
                </span>
              </td>
              <td className="px-4 py-3">{targetDisplay}</td>
              <td className="px-4 py-3 text-muted-foreground">{actorDisplay}</td>
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
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(log.createdAt).toLocaleString()}
              </td>
            </tr>
          );
        }}
      />

      <AdminPaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

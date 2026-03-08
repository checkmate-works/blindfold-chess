import { getTranslations } from 'next-intl/server';

import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { db, moderationActions, profiles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

const PAGE_SIZE = 20;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; user?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });
  const adminClient = createAdminClient();

  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const actionFilter = params.action || '';
  const userFilter = params.user?.trim() || '';

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
  const totalCount = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Fetch logs for current page
  const logs =
    filteredTargetIds?.length === 0
      ? []
      : await db
          .select()
          .from(moderationActions)
          .where(whereClause)
          .orderBy(desc(moderationActions.createdAt))
          .limit(PAGE_SIZE)
          .offset((currentPage - 1) * PAGE_SIZE);

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
  const buildHref = (page: number) => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    if (actionFilter) p.set('action', actionFilter);
    if (userFilter) p.set('user', userFilter);
    return `/admin/audit-log?${p.toString()}`;
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
            className="border border-border rounded px-3 py-2 text-sm bg-background"
          >
            <option value="">{t('auditLogTable.allActions')}</option>
            <option value="ban">ban</option>
            <option value="unban">unban</option>
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
            className="border border-border rounded px-3 py-2 text-sm bg-background"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('auditLogTable.action')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('auditLogTable.target')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('auditLogTable.actor')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('auditLogTable.reason')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('auditLogTable.ipAddress')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('auditLogTable.timestamp')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
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
                          ? 'bg-red-100 text-red-800'
                          : log.action === 'unban'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
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
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t('auditLogTable.noLogsFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} / {totalPages}
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a
                href={buildHref(currentPage - 1)}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
              >
                {t('auditLogTable.previousPage')}
              </a>
            )}
            {currentPage < totalPages && (
              <a
                href={buildHref(currentPage + 1)}
                className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
              >
                {t('auditLogTable.nextPage')}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

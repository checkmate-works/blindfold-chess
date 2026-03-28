import { getTranslations } from 'next-intl/server';

import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';

import { db, profiles, userActivityLog } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

import { PaginationNav } from '@/app/[locale]/_components';

const PAGE_SIZE = 20;

function getActionBadgeClasses(action: string): string {
  switch (action) {
    // Destructive / dangerous
    case 'delete_account':
    case 'delete_post':
      return 'bg-destructive-soft text-destructive-soft-foreground';

    // Security attention
    case 'change_password':
    case 'request_password_reset':
    case 'logout':
      return 'bg-warning-soft text-warning-soft-foreground';

    // Normal operations
    case 'login':
    case 'create_post':
    case 'create_reply':
    case 'like':
    case 'unlike':
      return 'bg-info-soft text-info-soft-foreground';

    // Profile / social
    case 'follow':
    case 'unfollow':
    case 'update_profile':
      return 'bg-success-soft text-success-soft-foreground';

    // Default / unknown
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

function formatUserDisplay(
  userId: string,
  profileMap: Map<string, { username: string | null }>,
  emailMap: Map<string, string>
): string {
  const profile = profileMap.get(userId);
  if (profile?.username) return profile.username;

  const email = emailMap.get(userId);
  if (email) return email;

  // Neither username nor email available — likely a deleted account
  const shortId = userId.length > 8 ? userId.slice(0, 8) : userId;
  return `[deleted] (${shortId}...)`;
}

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

  const currentPage = Math.max(1, page);
  const userFilter = rawUser.trim();

  // Build where conditions
  const conditions = [];
  if (actionFilter) {
    conditions.push(eq(userActivityLog.action, actionFilter));
  }

  // If user filter is set, find matching user IDs from profiles
  let filteredUserIds: string[] | null = null;
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
      filteredUserIds = [];
    } else {
      filteredUserIds = allMatchingIds;
      conditions.push(inArray(userActivityLog.userId, allMatchingIds));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userActivityLog)
    .where(whereClause);
  const totalCount = Number(countResult.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Fetch logs for current page
  const logs =
    filteredUserIds?.length === 0
      ? []
      : await db
          .select()
          .from(userActivityLog)
          .where(whereClause)
          .orderBy(desc(userActivityLog.createdAt))
          .limit(PAGE_SIZE)
          .offset((currentPage - 1) * PAGE_SIZE);

  // Collect unique user IDs for lookups
  const userIds = [...new Set(logs.map((l) => l.userId))];
  const targetIds = [...new Set(logs.filter((l) => l.targetId).map((l) => l.targetId!))];
  const allLookupIds = [...new Set([...userIds, ...targetIds])];

  // Fetch profiles
  const lookupProfiles =
    allLookupIds.length > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, allLookupIds))
      : [];
  const profileMap = new Map(lookupProfiles.map((p) => [p.id, p]));

  // Fetch emails from Supabase Auth
  const emailMap = new Map<string, string>();
  if (allLookupIds.length > 0) {
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

  // Get distinct action types for filter dropdown
  const actionTypes = await db
    .selectDistinct({ action: userActivityLog.action })
    .from(userActivityLog)
    .orderBy(userActivityLog.action);

  // Build search params for pagination links
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
        <div>
          <label htmlFor="action-filter" className="block text-sm font-medium mb-1">
            {t('activityLogTable.filterByAction')}
          </label>
          <select
            id="action-filter"
            name="action"
            defaultValue={actionFilter}
            className="border border-border rounded px-3 py-2 text-sm bg-card"
          >
            <option value="">{t('activityLogTable.allActions')}</option>
            {actionTypes.map((at) => (
              <option key={at.action} value={at.action}>
                {at.action}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="user-filter" className="block text-sm font-medium mb-1">
            {t('activityLogTable.filterByUser')}
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

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.action')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.user')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.target')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.metadata')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('activityLogTable.timestamp')}</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {logs.map((log) => {
              const userDisplay = formatUserDisplay(log.userId, profileMap, emailMap);
              const targetDisplay = log.targetId
                ? formatUserDisplay(log.targetId, profileMap, emailMap)
                : '-';
              const metadataStr = log.metadata ? JSON.stringify(log.metadata) : '-';

              return (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionBadgeClasses(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">{userDisplay}</td>
                  <td className="px-4 py-3">
                    {log.targetType && (
                      <span className="text-muted-foreground text-xs mr-1">[{log.targetType}]</span>
                    )}
                    {targetDisplay}
                  </td>
                  <td className="px-4 py-3">
                    {metadataStr !== '-' && metadataStr !== '{}' ? (
                      <span title={metadataStr} className="text-xs text-muted-foreground">
                        {metadataStr.length > 60 ? `${metadataStr.slice(0, 60)}...` : metadataStr}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
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

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

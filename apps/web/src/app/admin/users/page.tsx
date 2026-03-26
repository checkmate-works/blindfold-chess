import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger, parseAsString } from 'nuqs/server';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { db, moderationActions, profiles, userRoles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { PaginationNav } from '@/app/[locale]/_components';

import { AdminDataTable } from '../_components/AdminDataTable';
import { DEFAULT_PAGE_SIZE, getPaginationData } from '../_lib/pagination';
import { BanButton } from './_components/BanButton';
import { StatusFilter } from './_components/StatusFilter';
import { UnbanButton } from './_components/UnbanButton';

const FETCH_ALL_PAGE_SIZE = 1000;
const MAX_PAGES = 100;

async function fetchAllUsers(adminClient: SupabaseClient): Promise<User[]> {
  const allUsers: User[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: FETCH_ALL_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to fetch users (page ${page}): ${error.message}`);
    }

    const users = data?.users ?? [];
    allUsers.push(...users);

    if (users.length < FETCH_ALL_PAGE_SIZE) break;
    page++;
  }

  return allUsers;
}

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  status: parseAsString.withDefault(''),
});

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page, status: statusFilter } = await searchParamsCache.parse(searchParams);
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  type Profile = typeof profiles.$inferSelect;

  let users: User[];
  let currentPage: number;
  let totalPages: number;
  let profileMap: Map<string, Profile>;

  if (statusFilter) {
    const allUsers = await fetchAllUsers(adminClient);
    const allUserIds = allUsers.map((u) => u.id);

    const allProfiles =
      allUserIds.length > 0
        ? await db.select().from(profiles).where(inArray(profiles.id, allUserIds))
        : [];
    const allProfileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const filtered = allUsers.filter((user) => {
      const profile = allProfileMap.get(user.id);
      switch (statusFilter) {
        case 'active':
          return profile != null && profile.bannedAt == null;
        case 'banned':
          return profile != null && profile.bannedAt != null;
        case 'anonymous':
          return profile == null;
        default:
          return true;
      }
    });

    const totalCount = filtered.length;
    const pagination = getPaginationData(page, totalCount);
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    users = filtered.slice(pagination.offset, pagination.offset + pagination.limit);

    // Reuse allProfileMap for the paginated users instead of querying again
    profileMap = new Map<string, Profile>();
    for (const u of users) {
      const p = allProfileMap.get(u.id);
      if (p) profileMap.set(u.id, p);
    }
  } else {
    const { data: usersData } = await adminClient.auth.admin.listUsers({
      page: page,
      perPage: DEFAULT_PAGE_SIZE,
    });

    users = usersData?.users ?? [];
    const totalCount = usersData && 'total' in usersData ? usersData.total : 0;
    const pagination = getPaginationData(page, totalCount);
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages;

    const userIds = users.map((u) => u.id);
    const userProfiles =
      userIds.length > 0
        ? await db.select().from(profiles).where(inArray(profiles.id, userIds))
        : [];
    profileMap = new Map(userProfiles.map((p) => [p.id, p]));
  }

  const userIds = users.map((u) => u.id);

  const roles =
    userIds.length > 0
      ? await db.select().from(userRoles).where(inArray(userRoles.userId, userIds))
      : [];
  const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

  // Fetch latest ban reason for each banned user from moderation_actions
  const bannedUserIds = [...profileMap.values()].filter((p) => p.bannedAt != null).map((p) => p.id);
  const banReasonMap = new Map<string, string | null>();
  if (bannedUserIds.length > 0) {
    const banReasons = await db
      .select({
        targetId: moderationActions.targetId,
        reason: moderationActions.reason,
        createdAt: moderationActions.createdAt,
      })
      .from(moderationActions)
      .where(
        and(
          eq(moderationActions.action, 'ban'),
          eq(moderationActions.targetType, 'user'),
          inArray(moderationActions.targetId, bannedUserIds)
        )
      )
      .orderBy(desc(moderationActions.createdAt));

    // First occurrence per user is the latest (due to ORDER BY)
    for (const row of banReasons) {
      if (!banReasonMap.has(row.targetId)) {
        banReasonMap.set(row.targetId, row.reason);
      }
    }
  }

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (statusFilter) params.set('status', statusFilter);
    return `/admin/users?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('users')}</h1>

      <div className="mb-6">
        <StatusFilter
          labels={{
            filterByStatus: t('usersTable.filterByStatus'),
            allStatuses: t('usersTable.allStatuses'),
            active: t('usersTable.active'),
            banned: t('usersTable.banned'),
            anonymous: t('usersTable.anonymous'),
          }}
        />
      </div>

      <AdminDataTable
        headers={[
          t('usersTable.email'),
          t('usersTable.username'),
          t('usersTable.role'),
          t('usersTable.status'),
          t('usersTable.createdAt'),
          t('usersTable.actions'),
        ]}
        items={users}
        emptyMessage={t('usersTable.noUsersFound')}
        renderRow={(user) => {
          const profile = profileMap.get(user.id);
          const isBanned = profile?.bannedAt != null;
          const isCurrentUser = currentUser?.id === user.id;
          const banReason = banReasonMap.get(user.id) ?? null;

          return (
            <tr key={user.id} className="border-t border-border">
              <td className="px-4 py-3">{user.email ?? '-'}</td>
              <td className="px-4 py-3">
                {profile?.username ? (
                  <Link
                    href={`/en/profile/${encodeURIComponent(profile.username)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {profile.username}
                    <FaExternalLinkAlt className="h-3 w-3" />
                  </Link>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    roleMap.get(user.id) === 'admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {roleMap.get(user.id) ?? t('usersTable.defaultRole')}
                </span>
              </td>
              <td className="px-4 py-3">
                {!profile ? (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-warning-soft text-warning-soft-foreground">
                    {t('usersTable.anonymous')}
                  </span>
                ) : isBanned ? (
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-destructive-soft text-destructive-soft-foreground">
                      {t('usersTable.banned')}
                    </span>
                    {banReason && (
                      <p className="text-xs text-muted-foreground mt-1" title={banReason}>
                        {banReason.length > 50 ? `${banReason.slice(0, 50)}...` : banReason}
                      </p>
                    )}
                    {profile.bannedAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(profile.bannedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-success-soft text-success-soft-foreground">
                    {t('usersTable.active')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {profile && (
                    <>
                      <Link
                        href={`/admin/topic_posts?user=${encodeURIComponent(profile?.username ?? user.email ?? user.id)}`}
                        className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                      >
                        {t('usersTable.viewPosts')}
                      </Link>
                      <Link
                        href={`/admin/activity-log?user=${encodeURIComponent(profile.username)}`}
                        className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                      >
                        {t('usersTable.viewActivity')}
                      </Link>
                    </>
                  )}
                  {!isCurrentUser && profile && (
                    <>
                      {isBanned ? <UnbanButton userId={user.id} /> : <BanButton userId={user.id} />}
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        }}
      />

      <PaginationNav currentPage={currentPage} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

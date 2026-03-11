import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { and, desc, eq, inArray } from 'drizzle-orm';
import { createSearchParamsCache, parseAsInteger } from 'nuqs/server';
import { FaExternalLinkAlt } from 'react-icons/fa';

import { db, moderationActions, profiles, userRoles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { PaginationNav } from '@/app/[locale]/_components';

import { BanButton } from './_components/BanButton';
import { UnbanButton } from './_components/UnbanButton';

const PAGE_SIZE = 20;

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
});

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParamsCache.parse(searchParams);
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const currentPage = Math.max(1, page);

  const { data: usersData } = await adminClient.auth.admin.listUsers({
    page: currentPage,
    perPage: PAGE_SIZE,
  });

  const users = usersData?.users ?? [];
  const totalCount = usersData && 'total' in usersData ? usersData.total : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const userIds = users.map((u) => u.id);

  const roles =
    userIds.length > 0
      ? await db.select().from(userRoles).where(inArray(userRoles.userId, userIds))
      : [];
  const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

  const userProfiles =
    userIds.length > 0 ? await db.select().from(profiles).where(inArray(profiles.id, userIds)) : [];
  const profileMap = new Map(userProfiles.map((p) => [p.id, p]));

  // Fetch latest ban reason for each banned user from moderation_actions
  const bannedUserIds = userProfiles.filter((p) => p.bannedAt != null).map((p) => p.id);
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

  const buildHref = (p: number) => `/admin/users?page=${p}`;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('users')}</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('usersTable.email')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('usersTable.username')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('usersTable.role')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('usersTable.status')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('usersTable.createdAt')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('usersTable.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
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
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {t('usersTable.anonymous')}
                      </span>
                    ) : isBanned ? (
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
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
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
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
                            className="px-3 py-1 text-xs font-medium rounded bg-secondary text-foreground hover:bg-background border border-border transition-colors"
                          >
                            {t('usersTable.viewPosts')}
                          </Link>
                          <Link
                            href={`/admin/activity-log?user=${encodeURIComponent(profile.username)}`}
                            className="px-3 py-1 text-xs font-medium rounded bg-secondary text-foreground hover:bg-background border border-border transition-colors"
                          >
                            {t('usersTable.viewActivity')}
                          </Link>
                        </>
                      )}
                      {!isCurrentUser && profile && (
                        <>
                          {isBanned ? (
                            <UnbanButton userId={user.id} />
                          ) : (
                            <BanButton userId={user.id} />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t('usersTable.noUsersFound')}
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

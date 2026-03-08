import { getTranslations } from 'next-intl/server';

import { and, desc, eq, inArray } from 'drizzle-orm';

import { db, moderationActions, profiles, userRoles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { BanButton } from './_components/BanButton';
import { UnbanButton } from './_components/UnbanButton';

export default async function AdminUsersPage() {
  const adminClient = createAdminClient();
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: usersData } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const users = usersData?.users ?? [];

  const roles = await db.select().from(userRoles);
  const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

  const allProfiles = await db.select().from(profiles);
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  // Fetch latest ban reason for each banned user from moderation_actions
  const bannedUserIds = allProfiles.filter((p) => p.bannedAt != null).map((p) => p.id);
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('users')}</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('usersTable.email')}</th>
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
                    {!isCurrentUser && profile && (
                      <>
                        {isBanned ? (
                          <UnbanButton userId={user.id} />
                        ) : (
                          <BanButton userId={user.id} />
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('usersTable.noUsersFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { db, userRoles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminUsersPage() {
  const adminClient = createAdminClient();

  const { data: usersData } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const users = usersData?.users ?? [];

  const roles = await db.select().from(userRoles);
  const roleMap = new Map(roles.map((r) => [r.userId, r.role]));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
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
                    {roleMap.get(user.id) ?? 'user'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

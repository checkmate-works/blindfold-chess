import { count } from 'drizzle-orm';

import { db, userRoles } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminDashboardPage() {
  const adminClient = createAdminClient();

  const [usersResponse, roleCountResult] = await Promise.all([
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.select({ count: count() }).from(userRoles),
  ]);

  const totalUsers = usersResponse.data?.users?.length ?? 0;
  const totalRoles = roleCountResult[0]?.count ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-secondary p-6">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="text-3xl font-semibold mt-1">{totalUsers}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary p-6">
          <p className="text-sm text-muted-foreground">Role Assignments</p>
          <p className="text-3xl font-semibold mt-1">{totalRoles}</p>
        </div>
      </div>
    </div>
  );
}

import { eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { db, userRoles } from '@/lib/db';

type AuthSuccess = { userId: string };
type AuthFailure = { error: 'unauthorized' };
type AuthResult = AuthSuccess | AuthFailure;

export async function requireAdmin(): Promise<AuthResult> {
  const user = await getOptionalUser();

  if (!user) {
    return { error: 'unauthorized' };
  }

  const [userRole] = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .limit(1);

  if (!userRole || userRole.role !== 'admin') {
    return { error: 'unauthorized' };
  }

  return { userId: user.id };
}

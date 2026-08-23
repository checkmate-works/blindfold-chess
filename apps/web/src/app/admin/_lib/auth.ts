import { NextResponse } from 'next/server';

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

/**
 * {@link requireAdmin} for a route handler: either the admin's id, or the 401
 * to return.
 *
 * ```ts
 * const auth = await adminApiGuard();
 * if ('response' in auth) return auth.response;
 * ```
 *
 * The admin image routes had this wrapper byte-for-byte in each file. Sharing
 * it matters less for the four lines than for the response body: a client that
 * switches on `error` sees one code for an expired admin session, and the third
 * admin route proves how easily that drifts -- it answers `Unauthorized` with a
 * capital U for the same condition.
 *
 * Server Actions do not use this; they propagate `requireAdmin`'s
 * `{ error: 'unauthorized' }` to the client component instead.
 */
export async function adminApiGuard(): Promise<AuthSuccess | { response: NextResponse }> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return { response: NextResponse.json({ error: auth.error }, { status: 401 }) };
  }
  return auth;
}

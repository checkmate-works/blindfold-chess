import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { authenticateAndGuardApi } from '@/lib/auth';
import { isValidOrigin } from '@/lib/csrf';
import { db, profiles } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivityEvent } from '@/lib/users/activity-log';

export async function DELETE(request: Request) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const guardResult = await authenticateAndGuardApi(RATE_LIMITS.deleteAccount);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  // Soft-delete the auth user first via admin client.
  // This order ensures that if deleteUser fails, profile data remains intact.
  // If profile cleanup fails after auth deletion, the user can no longer log in
  // and leftover data can be cleaned up later — a much safer failure mode.
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(user.id, true);

  if (error) {
    return NextResponse.json({ error: 'failed_to_delete_auth_user' }, { status: 500 });
  }

  // NULL out personal info columns and set deleted_at
  await db
    .update(profiles)
    .set({
      displayName: null,
      avatarUrl: null,
      bio: null,
      country: null,
      flair: null,
      fideId: null,
      chesscomUsername: null,
      lichessUsername: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));

  logActivityEvent({
    userId: user.id,
    action: 'delete_account',
    targetType: 'user',
    targetId: user.id,
  });

  return NextResponse.json({ success: true });
}

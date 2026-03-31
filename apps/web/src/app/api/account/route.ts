import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { authenticateAndGuardApi } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE() {
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

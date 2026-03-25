import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { logActivityEvent } from '@/lib/activity-log';
import { isUserBanned } from '@/lib/ban';
import { db, profiles } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (await isUserBanned(user.id)) {
    return NextResponse.json({ error: 'banned' }, { status: 403 });
  }

  const rateLimitResult = await checkRateLimit(user.id, RATE_LIMITS.deleteAccount);
  if ('error' in rateLimitResult) {
    return NextResponse.json({ error: 'rateLimited' }, { status: 429 });
  }

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

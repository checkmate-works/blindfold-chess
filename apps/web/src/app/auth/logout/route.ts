import { NextResponse } from 'next/server';

import { db, userActivityLog } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /auth/logout
 *
 * Records a logout activity event for the authenticated user.
 * The actual sign-out (clearing the session) is performed client-side
 * via `supabase.auth.signOut()`. This endpoint exists solely to
 * persist the logout event in `user_activity_log`.
 *
 * Fire-and-forget from the client perspective — a failure here must
 * never prevent the user from signing out.
 *
 * Unlike other activity log call sites that use `logActivityEvent()`
 * (fire-and-forget), this route awaits the DB insert directly.
 * In a Route Handler, returning a Response ends the request lifecycle
 * and any pending Promises may be discarded by the runtime.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    await db.insert(userActivityLog).values({
      userId: user.id,
      action: 'logout',
      targetType: null,
      targetId: null,
      metadata: {},
    });
  } catch {
    // Logging failure must never prevent the logout response.
  }

  return NextResponse.json({ ok: true });
}

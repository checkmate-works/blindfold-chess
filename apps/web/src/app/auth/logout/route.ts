import { NextResponse } from 'next/server';

import { logActivityEvent } from '@/lib/activity-log';
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
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  logActivityEvent({
    userId: user.id,
    action: 'logout',
  });

  return NextResponse.json({ ok: true });
}

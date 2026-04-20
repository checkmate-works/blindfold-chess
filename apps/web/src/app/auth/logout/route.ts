import { NextResponse } from 'next/server';

import { ADS_HIDDEN_COOKIE_NAME } from '@/lib/ads/ads-hidden-cookie';
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
    const response = NextResponse.json({ ok: false }, { status: 401 });
    // Defensive: clear the no-flash ad-hide cookie even when the session was
    // already missing, so stale values do not outlive the session cookie.
    response.cookies.delete(ADS_HIDDEN_COOKIE_NAME);
    return response;
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

  const response = NextResponse.json({ ok: true });
  // Clear the no-flash ad-hide cookie on sign-out. The Supabase browser SDK
  // clears its own session cookies via `supabase.auth.signOut()` on the
  // client — this handler clears our ad-hide hint cookie server-side so
  // anonymous browsing after logout immediately reverts to showing ads.
  response.cookies.delete(ADS_HIDDEN_COOKIE_NAME);
  return response;
}

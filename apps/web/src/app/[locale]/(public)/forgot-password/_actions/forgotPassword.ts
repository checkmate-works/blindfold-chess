'use server';

import { SITE_URL } from '@/config';

import type { ActionResult } from '@/lib/action-types';
import { logActivityEvent } from '@/lib/activity-log';
import { getClientIp } from '@/lib/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimitGuard } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type ForgotPasswordResult = ActionResult;

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const ipRateLimited = checkIpRateLimitGuard(
    await getClientIp(),
    'forgotPassword',
    IP_RATE_LIMITS.forgotPassword
  );
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
  });

  // Always fall through regardless of error to prevent account enumeration.
  // Returning a distinct error when the email doesn't exist would let an
  // attacker probe which addresses are registered.

  // Log the password reset request if a session exists (e.g. user is already
  // signed in and requests a reset). In the typical unauthenticated flow,
  // userId will be null and we skip logging because user_activity_log.user_id
  // is NOT NULL.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    logActivityEvent({
      userId: user.id,
      action: 'request_password_reset',
    });
  }

  return { success: true };
}

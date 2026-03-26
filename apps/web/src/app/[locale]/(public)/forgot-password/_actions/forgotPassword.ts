'use server';

import { SITE_URL } from '@/config';

import type { ActionResult } from '@/lib/action-types';
import { logActivityEvent } from '@/lib/activity-log';
import { getClientIp } from '@/lib/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type ForgotPasswordResult = ActionResult;

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const ip = await getClientIp();
  if (ip) {
    const { allowed } = checkIpRateLimit(ip, 'forgotPassword', IP_RATE_LIMITS.forgotPassword);
    if (!allowed) {
      return { error: 'rateLimited' };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: 'resetFailed' };
  }

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

'use server';

import { SITE_URL } from '@/config';
import { z } from 'zod';

import type { ActionResult } from '@/lib/action-types';
import { getOptionalUser } from '@/lib/auth';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';

export type ForgotPasswordResult = ActionResult;

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const ipRateLimited = await guardByIpRateLimit('forgotPassword');
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const emailSchema = z.string().email().max(254);
  if (!emailSchema.safeParse(email).success) {
    return { error: 'resetFailed' };
  }

  // No per-email rate-limit guard here on purpose: it would let an attacker
  // lock a specific account out of password recovery. The redesign
  // (always-success response + internal suppression) is tracked in GitHub
  // issue #89.

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
  const user = await getOptionalUser();
  if (user) {
    logActivityEvent({
      userId: user.id,
      action: 'request_password_reset',
    });
  }

  return { success: true };
}

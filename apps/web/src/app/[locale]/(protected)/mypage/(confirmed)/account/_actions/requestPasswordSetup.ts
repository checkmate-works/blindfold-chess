'use server';

import { SITE_URL } from '@/config';

import type { ActionResult } from '@/lib/action-types';
import type { AuthGuardError } from '@/lib/auth';
import { authenticateAndGuard } from '@/lib/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/sentry/capture-error';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';

/**
 * Why sending the password email can fail.
 *
 * - `noEmail` — the account has no email address to send to
 * - `sendFailed` — the auth server could not send it
 */
export type RequestPasswordSetupError = AuthGuardError | 'noEmail' | 'sendFailed';

export type RequestPasswordSetupResult = ActionResult<{ email: string }, RequestPasswordSetupError>;

/**
 * Send the signed-in user a password set-up / change email.
 *
 * The page never takes a password itself: it reuses the recovery flow (email
 * link → `/auth/callback?type=recovery` → `/reset-password`). That gives a
 * Google-only user a way to add a password, and it keeps the strength of
 * `secure_password_change` — which asks a session older than 24 hours to
 * re-authenticate — without a re-authentication UI, because the recovery link
 * issues a fresh session. The `email` identity the auth server does not
 * create for a Google-only user is added by `resetPassword` afterwards.
 */
export async function requestPasswordSetup(): Promise<RequestPasswordSetupResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.requestPasswordSetup);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  if (!user.email) {
    return { error: 'noEmail' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
  });
  if (error) {
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return { error: 'rateLimited' };
    }
    captureError(error, '[requestPasswordSetup] resetPasswordForEmail failed');
    return { error: 'sendFailed' };
  }

  logActivityEvent({ userId: user.id, action: 'request_password_setup' });
  return { success: true, email: user.email };
}

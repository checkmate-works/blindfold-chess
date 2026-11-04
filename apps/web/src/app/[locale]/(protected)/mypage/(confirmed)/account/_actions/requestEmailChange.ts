'use server';

import type { ActionResult } from '@/lib/action-types';
import type { AuthGuardError } from '@/lib/auth';
import { authenticateAndGuard } from '@/lib/auth';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { captureError } from '@/lib/sentry/capture-error';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';
import { isValidEmail } from '@/lib/validations/email';

/**
 * Why starting an email change can fail.
 *
 * - `invalidEmail` — not an email address
 * - `sameEmail` — the current address
 * - `emailUnavailable` — the auth server refused the address (another account
 *   uses it, or it is not deliverable). The two are not told apart, so the
 *   form cannot be used to probe which addresses have accounts
 * - `sendFailed` — the confirmation emails could not be sent
 */
export type RequestEmailChangeError =
  AuthGuardError | 'invalidEmail' | 'sameEmail' | 'emailUnavailable' | 'sendFailed';

export type RequestEmailChangeResult = ActionResult<Record<never, never>, RequestEmailChangeError>;

/**
 * Start an email change for the signed-in user.
 *
 * With `double_confirm_changes` on, the auth server mails both the current
 * and the new address. Nothing changes until the links in both have been
 * opened (`/auth/callback` with `type=email_change`), so this action itself
 * mutates nothing but the pending `email_change` column.
 */
export async function requestEmailChange(newEmail: string): Promise<RequestEmailChangeResult> {
  const guardResult = await authenticateAndGuard(RATE_LIMITS.requestEmailChange);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  const email = newEmail.trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { error: 'invalidEmail' };
  }
  if (email === user.email?.toLowerCase()) {
    return { error: 'sameEmail' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    if (error.code === 'email_exists' || error.code === 'email_address_invalid') {
      return { error: 'emailUnavailable' };
    }
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return { error: 'rateLimited' };
    }
    captureError(error, '[requestEmailChange] updateUser({ email }) failed');
    return { error: 'sendFailed' };
  }

  logActivityEvent({ userId: user.id, action: 'request_email_change' });
  return { success: true };
}

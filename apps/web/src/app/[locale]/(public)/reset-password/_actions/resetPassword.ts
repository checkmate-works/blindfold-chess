'use server';

import type { ActionResult } from '@/lib/action-types';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { ensureEmailIdentity } from '@/lib/users/login-methods';
import { getPasswordValidationError } from '@/lib/validations/password';

export type ResetPasswordResult = ActionResult;

/**
 * Set the password of the session the recovery link just issued.
 *
 * This is also how a Google-only user gets a password: the account page's
 * "Set a password" sends the same recovery email. The auth server does not
 * create an `email` identity when a password is added, and without one it
 * later refuses to unlink Google as the account's "last identity", so the
 * identity is added here once the password is in place.
 */
export async function resetPassword(password: string): Promise<ResetPasswordResult> {
  const ipRateLimited = await guardByIpRateLimit('resetPassword');
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: `password:${passwordError}` };
  }

  const supabase = await createClient();
  const { data, error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return { error: 'updateFailed' };
  }

  if (data.user.email) {
    await ensureEmailIdentity(data.user.id, data.user.email, data.user.identities ?? []);
  }

  return { success: true };
}

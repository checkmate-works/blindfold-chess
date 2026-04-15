'use server';

import type { ActionResult } from '@/lib/action-types';
import { getClientIp } from '@/lib/security/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimitGuard } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { getPasswordValidationError } from '@/lib/validations/password';

export type ResetPasswordResult = ActionResult;

export async function resetPassword(password: string): Promise<ResetPasswordResult> {
  const ipRateLimited = checkIpRateLimitGuard(
    await getClientIp(),
    'resetPassword',
    IP_RATE_LIMITS.resetPassword
  );
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: `password:${passwordError}` };
  }

  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return { error: 'updateFailed' };
  }

  return { success: true };
}

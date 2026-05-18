'use server';

import type { ActionResult } from '@/lib/action-types';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { getPasswordValidationError } from '@/lib/validations/password';

export type ResetPasswordResult = ActionResult;

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
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return { error: 'updateFailed' };
  }

  return { success: true };
}

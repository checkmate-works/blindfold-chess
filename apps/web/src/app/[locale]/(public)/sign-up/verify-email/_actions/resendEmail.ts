'use server';

import type { ActionResult } from '@/lib/action-types';
import { getClientIp } from '@/lib/security/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimitGuard } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type ResendEmailResult = ActionResult;

export async function resendEmail(email: string): Promise<ResendEmailResult> {
  const ipRateLimited = await checkIpRateLimitGuard(
    await getClientIp(),
    'resendEmail',
    IP_RATE_LIMITS.resendEmail
  );
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    return { error: 'resendFailed' };
  }

  return { success: true };
}

'use server';

import type { ActionResult } from '@/lib/action-types';
import { getClientIp } from '@/lib/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type ResendEmailResult = ActionResult;

export async function resendEmail(email: string): Promise<ResendEmailResult> {
  const ip = await getClientIp();
  if (ip) {
    const { allowed } = checkIpRateLimit(ip, 'resendEmail', IP_RATE_LIMITS.resendEmail);
    if (!allowed) {
      return { error: 'rateLimited' };
    }
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

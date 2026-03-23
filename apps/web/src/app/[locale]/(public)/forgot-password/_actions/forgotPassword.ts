'use server';

import { SITE_URL } from '@/config';

import { getClientIp } from '@/lib/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type ForgotPasswordResult = { success: true } | { error: string };

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

  return { success: true };
}

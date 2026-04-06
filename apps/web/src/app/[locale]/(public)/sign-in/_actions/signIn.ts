'use server';

import { z } from 'zod';

import { logActivityEvent } from '@/lib/activity-log';
import { getClientIp } from '@/lib/client-ip';
import { getLocaleFromRequest } from '@/lib/locale';
import { IP_RATE_LIMITS, checkIpRateLimitGuard } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type SignInResult = { error: string } | { success: true; locale: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const ipRateLimited = checkIpRateLimitGuard(await getClientIp(), 'signIn', IP_RATE_LIMITS.signIn);
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const emailSchema = z.string().email().max(254);
  if (!emailSchema.safeParse(email).success) {
    return { error: 'invalidCredentials' };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'invalidCredentials' };
  }

  logActivityEvent({
    userId: data.user.id,
    action: 'login',
  });

  const locale = await getLocaleFromRequest();
  return { success: true, locale };
}

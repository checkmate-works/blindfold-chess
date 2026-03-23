'use server';

import { getClientIp } from '@/lib/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type SignInResult = { success: true } | { error: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const ip = await getClientIp();
  if (ip) {
    const { allowed } = checkIpRateLimit(ip, 'signIn', IP_RATE_LIMITS.signIn);
    if (!allowed) {
      return { error: 'rateLimited' };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'invalidCredentials' };
  }

  return { success: true };
}

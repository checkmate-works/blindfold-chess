'use server';

import { redirect } from 'next/navigation';

import { getClientIp } from '@/lib/client-ip';
import { getLocaleFromRequest } from '@/lib/locale';
import { IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';

export type SignInResult = { error: string };

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

  const locale = await getLocaleFromRequest();
  redirect(`/${locale}/mypage?toast=login_success`);
}

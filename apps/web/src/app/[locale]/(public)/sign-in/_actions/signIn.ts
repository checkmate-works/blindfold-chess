'use server';

import { z } from 'zod';

import { getLocaleFromRequest } from '@/lib/locale';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';

export type SignInResult = { error: string } | { success: true; locale: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const ipRateLimited = await guardByIpRateLimit('signIn');
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

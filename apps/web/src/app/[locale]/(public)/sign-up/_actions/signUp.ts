'use server';

import { SITE_URL } from '@/config';

import { getClientIp } from '@/lib/client-ip';
import { IP_RATE_LIMITS, checkIpRateLimit } from '@/lib/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { passwordSchema } from '@/lib/validations/password';

export type SignUpResult = { success: true } | { error: string };

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const ip = await getClientIp();
  if (ip) {
    const { allowed } = checkIpRateLimit(ip, 'signUp', IP_RATE_LIMITS.signUp);
    if (!allowed) {
      return { error: 'rateLimited' };
    }
  }

  const validation = passwordSchema.safeParse(password);
  if (!validation.success) {
    return { error: 'passwordInvalid' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: 'signUpFailed' };
  }

  return { success: true };
}

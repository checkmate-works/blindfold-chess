'use server';

import { SITE_URL } from '@/config';

import type { ActionResult } from '@/lib/action-types';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { getPasswordValidationError } from '@/lib/validations/password';

export type SignUpResult = ActionResult;

export async function signUp(email: string, password: string): Promise<SignUpResult> {
  const ipRateLimited = await guardByIpRateLimit('signUp');
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: `password:${passwordError}` };
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
    if (error.code === 'weak_password') {
      return { error: 'password:weak' };
    }
    return { error: 'signUpFailed' };
  }

  return { success: true };
}

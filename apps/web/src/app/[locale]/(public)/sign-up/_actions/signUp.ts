'use server';

import { SITE_URL } from '@/config';

import type { ActionResult } from '@/lib/action-types';
import { resolveReturnPath } from '@/lib/auth-return-path';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { getPasswordValidationError } from '@/lib/validations/password';

export type SignUpResult = ActionResult;

export async function signUp(
  email: string,
  password: string,
  next?: string
): Promise<SignUpResult> {
  const ipRateLimited = await guardByIpRateLimit('signUp');
  if (ipRateLimited) {
    return ipRateLimited;
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    return { error: `password:${passwordError}` };
  }

  // Carry a validated `next` into the confirmation link so the callback lands
  // the new user back on the CTA-gated page after they confirm their email.
  const safeNext = resolveReturnPath(next);
  const callback = new URL('/auth/callback', SITE_URL);
  if (safeNext) callback.searchParams.set('next', safeNext);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callback.toString(),
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

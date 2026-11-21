'use server';

import { postSignInPath } from '@/lib/auth-return-path';
import { getLocaleFromRequest } from '@/lib/locale';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';
import { getViewerProfile } from '@/lib/users/viewer-profile';
import { isValidEmail } from '@/lib/validations/email';

export type SignInResult = { error: string } | { success: true; destination: string };

/**
 * Signs in with email and password and returns where the client should
 * hard-navigate next.
 *
 * The destination is decided here, from the user's profile, rather than by
 * the client: a provisional user (no `profiles` row) is sent straight to
 * username setup instead of to `next`. See `postSignInPath`.
 *
 * @param next - The return target the sign-in page was opened with. Untrusted
 *   (it arrives from the client); `postSignInPath` re-validates it.
 */
export async function signIn(
  email: string,
  password: string,
  next?: string
): Promise<SignInResult> {
  const ipRateLimited = await guardByIpRateLimit('signIn');
  if (ipRateLimited) {
    return ipRateLimited;
  }

  if (!isValidEmail(email)) {
    return { error: 'invalidCredentials' };
  }

  // No per-email rate-limit guard here on purpose: the obvious shape lets an
  // attacker DoS a specific account by burning the bucket. Redesign tracked
  // in GitHub issue #89.

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'invalidCredentials' };
  }

  logActivityEvent({
    userId: data.user.id,
    action: 'login',
  });

  const [locale, profile] = await Promise.all([
    getLocaleFromRequest(),
    getViewerProfile(data.user.id),
  ]);
  return {
    success: true,
    destination: postSignInPath({ locale, next, hasProfile: profile !== null }),
  };
}

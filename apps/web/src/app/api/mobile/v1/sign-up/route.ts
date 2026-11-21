import { SITE_URL } from '@/config';
import { createClient } from '@supabase/supabase-js';

import {
  mobileError,
  mobileJson,
  mobilePreflight,
  readJsonBody,
  withMobileErrors,
} from '@/lib/mobile-api/response';
import { guardByIpRateLimit } from '@/lib/security/rate-limit-ip';
import { getPasswordValidationError } from '@/lib/validations/password';

/**
 * Registers an email account for the app (`{ email, password }`), with the
 * web sign-up's checks: the per-IP rate limit, the password rules, and a
 * confirmation link that lands on the web's `/auth/callback`. The new user
 * confirms in the browser, then signs in from the app. Answers 200
 * `{ success: true }`, 422 `password:<reason>` / `signUpFailed`, or 429.
 *
 * Sign-in itself needs no route: the app calls Supabase Auth directly, which
 * rate-limits it there. Sign-up goes through here so the password rules and
 * the redirect stay the web's own.
 */
export async function POST(request: Request) {
  return withMobileErrors('sign-up', async () => {
    if (await guardByIpRateLimit('signUp')) return mobileError('rateLimited', 429);

    const body = (await readJsonBody(request)) as
      { email?: unknown; password?: unknown } | undefined;
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!email) return mobileError('signUpFailed', 422);

    const passwordError = getPasswordValidationError(password);
    if (passwordError) return mobileError(`password:${passwordError}`, 422);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: new URL('/auth/callback', SITE_URL).toString() },
    });
    if (error) {
      return mobileError(error.code === 'weak_password' ? 'password:weak' : 'signUpFailed', 422);
    }
    return mobileJson({ success: true });
  });
}

export const OPTIONS = mobilePreflight;

import { cache } from 'react';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import type { User } from '@supabase/supabase-js';

import { isUserBanned } from '@/lib/moderation/ban';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user or redirects to sign-in.
 *
 * For `(protected)/` routes the parent layout already performs an auth
 * guard, so the redirect here is normally unreachable. It is also reached
 * directly from a few `(public)/` pages that gate their own access (e.g.
 * `practice/puzzle/new`); the locale prefix on the redirect target is
 * required so those callers don't land on an unlocalized 404.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/sign-in?toast=sign_in_required`);
  }
  return user;
});

/**
 * Returns the authenticated user or `null` without redirecting.
 *
 * Use this in contexts where unauthenticated access is expected
 * (e.g., Server Actions called from outside `(protected)/` routes).
 */
export const getOptionalUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Auth + ban guard for Server Actions (without rate limiting).
 *
 * Authenticates the user and checks ban status. Returns `{ user }` on
 * success or `{ error }` on failure. Use this when rate limiting needs
 * to be applied separately (e.g., after content validation).
 */
export async function authenticateAndCheckBan(): Promise<{ user: User } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'signInRequired' };
  }

  if (await isUserBanned(user.id)) {
    return { error: 'banned' };
  }

  return { user };
}

/**
 * Auth + ban + rate limit guard for Server Actions.
 *
 * Authenticates the user, checks ban status, and enforces rate limiting
 * in a single call. Returns `{ user }` on success or `{ error }` on failure.
 */
export async function authenticateAndGuard(
  rateLimitConfig: RateLimitConfig
): Promise<{ user: User } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'signInRequired' };
  }

  if (await isUserBanned(user.id)) {
    return { error: 'banned' };
  }

  const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
  if ('error' in rateLimitResult) {
    return { error: rateLimitResult.error };
  }

  return { user };
}

/**
 * Auth + ban + rate limit guard for API Routes.
 *
 * Authenticates the user, checks ban status, and enforces rate limiting
 * in a single call. Returns `{ user }` on success or a `NextResponse`
 * error response on failure.
 */
export async function authenticateAndGuardApi(
  rateLimitConfig: RateLimitConfig
): Promise<{ user: User } | { response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  if (await isUserBanned(user.id)) {
    return { response: NextResponse.json({ error: 'banned' }, { status: 403 }) };
  }

  const rateLimitResult = await checkRateLimit(user.id, rateLimitConfig);
  if ('error' in rateLimitResult) {
    return { response: NextResponse.json({ error: 'rateLimited' }, { status: 429 }) };
  }

  return { user };
}

import { cache } from 'react';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import type { User } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import { withReturnPath } from '@/lib/auth-return-path';
import { getCurrentReturnTarget } from '@/lib/current-return-target';
import { db, profiles } from '@/lib/db';
import { isUserBanned } from '@/lib/moderation/ban';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user or `null` without redirecting.
 *
 * Use this in contexts where unauthenticated access is expected
 * (e.g., Server Actions called from outside `(protected)/` routes).
 *
 * This is the single per-request Auth round-trip: every other helper in this
 * module — `getAuthenticatedUser` and the four action/API guards — delegates
 * here, so a layout calling one and a page calling another still share one
 * `auth.getUser()` call. `React.cache` memoizes by function identity, so a
 * second independently-wrapped fetcher would NOT dedupe — always route new
 * callers through this function.
 */
export const getOptionalUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Returns the authenticated user or redirects to sign-in.
 *
 * For `(protected)/` routes the proxy's own guard fires first, so the
 * redirect here is normally unreachable. It is also reached directly from a
 * few `(public)/` pages that gate their own access (e.g. `practice/puzzle/new`,
 * `chunks/[slug]/edit`) — those are the calls that matter, since no earlier
 * guard covers them. The locale prefix on the redirect target is required so
 * those callers don't land on an unlocalized 404, and `?next=` carries the
 * page they were denied so signing in resumes it.
 */
export const getAuthenticatedUser = cache(async () => {
  const user = await getOptionalUser();
  if (!user) {
    const locale = await getLocale();
    redirect(
      withReturnPath(`/${locale}/sign-in?toast=sign_in_required`, await getCurrentReturnTarget())
    );
  }
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
  const user = await getOptionalUser();

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
  const user = await getOptionalUser();

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
 * Whether a signed-in user has completed registration — i.e. a `profiles` row
 * exists (username set). A *provisional* user (confirmed session but no
 * profile) may browse and finish setup, but must not post content that is
 * publicly attributed to them, which would otherwise render as
 * "(deleted user)" for lack of a profile to name them.
 */
export async function userHasProfile(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return row != null;
}

/**
 * Auth + ban guard (no rate limiting) that additionally requires a completed
 * profile. Counterpart to `authenticateAndCheckBan` for action cores that
 * charge their rate limit later (after content validation): a provisional
 * user (signed in, no `profiles` row) is rejected with `profileRequired`
 * before any content lands, mirroring `authenticateGuardAndRequireProfile`.
 */
export async function authenticateCheckBanAndRequireProfile(): Promise<
  { user: User } | { error: string }
> {
  const guardResult = await authenticateAndCheckBan();
  if ('error' in guardResult) {
    return guardResult;
  }
  if (!(await userHasProfile(guardResult.user.id))) {
    return { error: 'profileRequired' };
  }
  return guardResult;
}

/**
 * Auth + ban + rate limit guard that additionally requires a completed profile.
 * Use for Server Actions that create public-attributed content (e.g. game
 * comments / chunk links): a provisional user is rejected with
 * `profileRequired`, so an unattributed post never lands. The client already
 * prompts them to finish registration up front (see `useAuthGuard`), so this
 * is defense in depth.
 */
export async function authenticateGuardAndRequireProfile(
  rateLimitConfig: RateLimitConfig
): Promise<{ user: User } | { error: string }> {
  const guardResult = await authenticateAndGuard(rateLimitConfig);
  if ('error' in guardResult) {
    return guardResult;
  }
  if (!(await userHasProfile(guardResult.user.id))) {
    return { error: 'profileRequired' };
  }
  return guardResult;
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
  const user = await getOptionalUser();

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

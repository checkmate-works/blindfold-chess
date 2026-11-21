import { cache } from 'react';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { isAuthRetryableFetchError } from '@supabase/supabase-js';
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
export const getOptionalUser = cache(async () => (await readAuthUser()).user);

/**
 * The Auth server's answer for this request's session cookie, including the
 * one failure the app has to act on.
 *
 * `userIsGone` is the Auth server's `user_not_found`: the cookie's JWT is
 * correctly signed and unexpired, but the user it names no longer exists
 * (the account was physically removed while this browser stayed signed in).
 * Nothing clears such a cookie on its own. auth-js drops the session by
 * itself for the neighbouring failure, `session_not_found` (signed out
 * elsewhere), but not for this one, and the proxy's `getClaims()` keeps
 * accepting the token until it expires — so the browser carries a cookie the
 * proxy reads as "signed in" and every page reads as anonymous. See
 * {@link discardSessionOfMissingUser}.
 *
 * `unavailable` is the opposite case: the Auth server could not be asked at
 * all (the request failed in transit, or was answered 502/503/504 — what
 * auth-js reports as a retryable fetch error). `user` is `null` then too, but
 * it says nothing about the visitor. See {@link isAuthUnavailable}.
 */
const readAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return {
    user,
    userIsGone: error?.code === 'user_not_found',
    unavailable: isAuthRetryableFetchError(error),
  };
});

/**
 * Whether this request's `null` user means "the Auth server could not be
 * reached" rather than "nobody is signed in".
 *
 * `getOptionalUser` and the guards built on it answer `null` /
 * `signInRequired` for both, which is the safe reading for access control.
 * It is the wrong one for a caller that would throw away the player's work on
 * `signInRequired`: a server-run challenge asks once per answer, sixty to a
 * hundred times a run, and treating one failed lookup as "signed out" ends
 * the run unrecorded. Such a caller asks this after a `signInRequired` and
 * treats `true` as a failure worth retrying. Shares the request's `getUser()`
 * round-trip, so it costs nothing extra.
 */
export async function isAuthUnavailable(): Promise<boolean> {
  return (await readAuthUser()).unavailable;
}

/**
 * Remove this browser's session cookie when it names a user that no longer
 * exists; a no-op for every other visitor (anonymous, signed in, or a
 * transient Auth failure — a session must never be thrown away on a blip).
 *
 * Call it only where cookies can be written (a Server Action or Route
 * Handler): from a Server Component the removal is silently dropped. It
 * shares the request's `getUser()` round-trip with `getOptionalUser`, so it
 * costs nothing unless there is a cookie to remove.
 *
 * `scope: 'local'` because there is nothing to revoke on the Auth server —
 * the user is gone — and auth-js clears the local session even though that
 * call is answered with an error.
 */
export async function discardSessionOfMissingUser(): Promise<void> {
  const { userIsGone } = await readAuthUser();
  if (!userIsGone) return;
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
}

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

/** Every error code {@link authenticateAndGuard} can return. */
export type AuthGuardError = 'signInRequired' | 'banned' | 'rateLimited';

/**
 * Auth + ban + rate limit guard for Server Actions.
 *
 * Authenticates the user, checks ban status, and enforces rate limiting
 * in a single call. Returns `{ user }` on success or `{ error }` on failure.
 */
export async function authenticateAndGuard(
  rateLimitConfig: RateLimitConfig
): Promise<{ user: User } | { error: AuthGuardError }> {
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

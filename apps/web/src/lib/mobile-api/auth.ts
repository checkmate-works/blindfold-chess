import type { NextResponse } from 'next/server';

import { createClient, isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import 'server-only';

import { isUserBanned } from '@/lib/moderation/ban';
import { type RateLimitConfig, checkRateLimit } from '@/lib/security/rate-limit';

import { mobileError } from './response';

/** The `Authorization: Bearer <token>` value, if the request has one. */
export function readBearerToken(request: Request): string | undefined {
  return request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
}

type Verified = { user: User } | 'invalid' | 'unavailable';

/**
 * Resolves a Supabase access token to its user by asking the Auth server
 * (`auth.getUser(jwt)`), so a revoked session or a deleted user is refused
 * rather than trusted until the token expires. An Auth outage is told apart
 * from a bad token: the app keeps its session on the first and signs out on
 * the second.
 */
async function verifyToken(token: string): Promise<Verified> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (user) return { user };
  return isAuthRetryableFetchError(error) ? 'unavailable' : 'invalid';
}

export type MobileAuthResult = { ok: true; user: User } | { ok: false; response: NextResponse };

/**
 * The mobile API's counterpart of `authenticateAndGuard`: the web's guards
 * read the cookie session, which the app does not have, and the CSRF origin
 * check (`guardApiMutation`) refuses requests with no `Origin`, which native
 * apps never send. Bearer tokens are not sent automatically by a browser,
 * so the CSRF check has nothing to protect here.
 *
 * - 401 `unauthorized` — no token, or one the Auth server rejects.
 * - 503 `authUnavailable` — the Auth server could not be reached; retry.
 * - 403 `banned` — unless `allowBanned` (the account screen must still load).
 * - 429 `rateLimited` — when `rateLimit` is given and spent (per user).
 */
export async function authorizeMobileRequest(
  request: Request,
  options: { rateLimit?: RateLimitConfig; allowBanned?: boolean } = {}
): Promise<MobileAuthResult> {
  const token = readBearerToken(request);
  if (!token) return { ok: false, response: mobileError('unauthorized', 401) };

  const verified = await verifyToken(token);
  if (verified === 'invalid') return { ok: false, response: mobileError('unauthorized', 401) };
  if (verified === 'unavailable') {
    return { ok: false, response: mobileError('authUnavailable', 503) };
  }
  const { user } = verified;

  if (!options.allowBanned && (await isUserBanned(user.id))) {
    return { ok: false, response: mobileError('banned', 403) };
  }
  if (options.rateLimit) {
    const limited = await checkRateLimit(user.id, options.rateLimit);
    if ('error' in limited) return { ok: false, response: mobileError('rateLimited', 429) };
  }
  return { ok: true, user };
}

import { NextResponse } from 'next/server';

import { adminApiGuard } from '@/app/admin/_lib/auth';
import type { User } from '@supabase/supabase-js';

import { authenticateAndGuardApi } from '@/lib/auth';
import { isValidOrigin } from '@/lib/csrf';
import type { RateLimitConfig } from '@/lib/security/rate-limit';
import { checkRateLimit } from '@/lib/security/rate-limit';

/**
 * CSRF origin check for mutation API Routes.
 *
 * Returns a `403 { error: 'forbidden' }` response when the request's Origin
 * header does not match the expected origin (see {@link isValidOrigin}), or
 * `null` when the request may proceed. Use this directly only in a route that
 * authenticates by some scheme neither prelude covers; otherwise call
 * {@link guardApiMutation} or {@link guardAdminApiMutation}.
 */
export function checkMutationOrigin(request: Request): NextResponse | null {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * Shared prelude for authenticated mutation API Routes:
 *
 * 1. CSRF origin check — `403 { error: 'forbidden' }` on mismatch.
 * 2. Auth + ban + rate limit via `authenticateAndGuardApi` — `401
 *    { error: 'unauthorized' }`, `403 { error: 'banned' }`, or `429
 *    { error: 'rateLimited' }` on failure.
 *
 * Returns `{ user }` on success or `{ response }` for the caller to return.
 */
export async function guardApiMutation(
  request: Request,
  rateLimitConfig: RateLimitConfig
): Promise<{ user: User } | { response: NextResponse }> {
  const originError = checkMutationOrigin(request);
  if (originError) {
    return { response: originError };
  }
  return authenticateAndGuardApi(rateLimitConfig);
}

/**
 * {@link guardApiMutation} for an API Route authenticated as an admin:
 *
 * 1. CSRF origin check — `403 { error: 'forbidden' }` on mismatch.
 * 2. Admin check via `adminApiGuard` — `401 { error: 'unauthorized' }`.
 * 3. When `rateLimitConfig` is given, that budget — `429
 *    { error: 'rateLimited' }` once it is spent.
 *
 * Returns `{ userId }` on success or `{ response }` for the caller to return.
 *
 * The rate limit is optional because the two admin image endpoints charge one
 * only on upload; their DELETE handlers deliberately charge none. Passing the
 * config rather than defaulting to one keeps that visible at the call site.
 *
 * Separate from {@link guardApiMutation} rather than a flag on it: the two
 * authenticate against different things and answer differently -- the
 * non-admin path also rejects a banned user with `403 { error: 'banned' }`,
 * which has no meaning for an admin route.
 */
export async function guardAdminApiMutation(
  request: Request,
  rateLimitConfig?: RateLimitConfig
): Promise<{ userId: string } | { response: NextResponse }> {
  const originError = checkMutationOrigin(request);
  if (originError) {
    return { response: originError };
  }

  const auth = await adminApiGuard();
  if ('response' in auth) {
    return auth;
  }

  if (rateLimitConfig) {
    const rateLimitResult = await checkRateLimit(auth.userId, rateLimitConfig);
    if ('error' in rateLimitResult) {
      return { response: NextResponse.json({ error: 'rateLimited' }, { status: 429 }) };
    }
  }

  return auth;
}

/**
 * Parses the request body as JSON.
 *
 * Returns `{ body }` on success or `{ response }` — a `400
 * { error: <errorCode> }` response (default `invalid_json`) — when the body
 * is not valid JSON. The type parameter only asserts the caller's expected
 * shape; fields must still be validated.
 */
export async function parseJsonBody<T>(
  request: Request,
  errorCode = 'invalid_json'
): Promise<{ body: T } | { response: NextResponse }> {
  let body: T;
  try {
    body = await request.json();
  } catch {
    return { response: NextResponse.json({ error: errorCode }, { status: 400 }) };
  }
  return { body };
}

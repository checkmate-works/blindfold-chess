import { NextResponse } from 'next/server';

import type { User } from '@supabase/supabase-js';

import { authenticateAndGuardApi } from '@/lib/auth';
import { isValidOrigin } from '@/lib/csrf';
import type { RateLimitConfig } from '@/lib/security/rate-limit';

/**
 * CSRF origin check for mutation API Routes.
 *
 * Returns a `403 { error: 'forbidden' }` response when the request's Origin
 * header does not match the expected origin (see {@link isValidOrigin}), or
 * `null` when the request may proceed. Use this directly in routes that have
 * their own authentication scheme (e.g. admin routes); routes guarded by
 * `authenticateAndGuardApi` should call {@link guardApiMutation} instead.
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

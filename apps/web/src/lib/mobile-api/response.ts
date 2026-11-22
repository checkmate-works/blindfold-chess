import { NextResponse } from 'next/server';

import 'server-only';

/**
 * JSON for the mobile API. Never cached by an intermediary (every answer is
 * the signed-in user's own), and CORS-open so the Expo web preview can call
 * it; native apps send no preflight. The API authenticates with a bearer
 * token, never cookies, so allowing any origin exposes nothing a cookie
 * session would.
 */
const MOBILE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
} as const;

export function mobileJson(body: unknown, init: { status?: number } = {}): NextResponse {
  return NextResponse.json(body, { status: init.status ?? 200, headers: MOBILE_HEADERS });
}

export function mobileError(error: string, status: number): NextResponse {
  return mobileJson({ error }, { status });
}

/** The CORS preflight answer every mobile route exports as `OPTIONS`. */
export function mobilePreflight(): NextResponse {
  // A 204 may not carry a body, so this is not `mobileJson(null)`.
  return new NextResponse(null, { status: 204, headers: MOBILE_HEADERS });
}

/** The request's JSON body, or undefined when it is not JSON. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * Runs a handler body and turns an unexpected throw (database or network
 * trouble) into 503 `temporarilyUnavailable`, which the app retries. The
 * challenge routes are idempotent per attempt, so a retry is always safe.
 */
export async function withMobileErrors(
  where: string,
  run: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await run();
  } catch (error) {
    console.error(`[mobile-api] ${where}`, error);
    return mobileError('temporarilyUnavailable', 503);
  }
}

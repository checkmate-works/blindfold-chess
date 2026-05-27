import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@supabase/ssr';

/**
 * Refresh the Supabase session cookie for the incoming request and return
 * a `NextResponse.next()` that forwards any updated cookies to the browser.
 *
 * The optional `requestHeaders` lets the caller (the proxy) inject headers
 * — notably `x-nonce` — that downstream Server Components need to read via
 * `headers()`. These headers are attached to the forwarded request (not
 * the response), so they are visible to RSCs without leaking to the client.
 */
export async function updateSession(
  request: NextRequest,
  options: { requestHeaders?: Headers } = {}
) {
  const requestHeaders = options.requestHeaders;
  const nextInit = requestHeaders ? { request: { headers: requestHeaders } } : { request };

  let supabaseResponse = NextResponse.next(nextInit);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: supabaseResponse, authenticated: false, userId: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next(nextInit);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Use getClaims() instead of getUser() for better performance.
  // getClaims() validates the JWT locally via JWKS (cached) and triggers
  // session refresh when called without a jwt parameter, avoiding a
  // round-trip to the Auth server on every request.
  const { data, error } = await supabase.auth.getClaims();
  const authenticated = !error && !!data;
  // The JWT `sub` claim holds the Supabase user id. Surface it for callers
  // that need to perform a per-user side effect (e.g., refreshing the
  // `bfc_ads_hidden` cookie in proxy.ts) without paying for a second
  // Supabase round-trip via `auth.getUser()`.
  const claims = (data as { claims?: { sub?: string } } | null)?.claims;
  const userId = authenticated ? (claims?.sub ?? null) : null;

  return { response: supabaseResponse, authenticated, userId };
}

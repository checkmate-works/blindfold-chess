import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `proxy.ts` is the global edge middleware for the app. These tests pin
 * down three behaviors that must hold for every request that flows through
 * it:
 *
 *   1. A per-request CSP nonce is generated and attached to the forwarded
 *      request via the `x-nonce` header, so downstream Server Components
 *      can read it through `headers()` and stamp it onto inline scripts.
 *   2. The response carries a `Content-Security-Policy-Report-Only` header
 *      (and NOT an enforcing `Content-Security-Policy` — sending both would
 *      make the browser honour the enforcing one) whose `script-src`
 *      contains the same nonce as `x-nonce`. The policy was downgraded to
 *      Report-Only in c6805b993; see the comment on `applyCspHeaders` in
 *      proxy.ts and GitHub issue #89 for the path back to enforcing.
 *   3. The response carries a `Report-To` header pointing at the
 *      `/api/csp-report` collector.
 *
 * `updateSession` is mocked so the tests do not require a live Supabase
 * instance. We echo back `requestHeaders` from the call so assertions can
 * verify the nonce actually reached Supabase/SSR (which is how RSCs later
 * see it via `headers()`).
 */

let capturedRequestHeaders: Headers | undefined;

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(
    async (_request: NextRequest, options: { requestHeaders?: Headers } = {}) => {
      capturedRequestHeaders = options.requestHeaders;
      const init = options.requestHeaders
        ? { request: { headers: options.requestHeaders } }
        : undefined;
      return { response: NextResponse.next(init), authenticated: false, userId: null };
    }
  ),
}));

// `computeAdsHiddenValueForUser` is `server-only`; vitest will choke on the
// import unless we either silence `server-only` or mock the module entirely.
// We mock the compute step so the ads-hidden-cookie writer pulled in by
// proxy.ts does not transitively pull `server-only` into the test runtime.
vi.mock('@/lib/ads/ads-hidden-cookie-compute', () => ({
  computeAdsHiddenValueForUser: vi.fn(async () => null),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Import AFTER the mock above so the module picks up the mocked dependency.
const { proxy } = await import('./proxy');

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'https://example.test'));
}

describe('proxy', () => {
  beforeEach(() => {
    capturedRequestHeaders = undefined;
  });

  it('generates a nonce and forwards it on the request as x-nonce', async () => {
    await proxy(makeRequest('/en'));

    expect(capturedRequestHeaders).toBeDefined();
    const nonce = capturedRequestHeaders?.get('x-nonce');
    expect(nonce).toBeTruthy();
    // 16 random bytes -> 24-character base64 string (includes padding).
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22,24}={0,2}$/);
  });

  it('sets a Report-Only CSP header whose script-src contains the forwarded nonce', async () => {
    const response = await proxy(makeRequest('/en'));

    // CSP is currently Report-Only on purpose — see the comment on
    // `applyCspHeaders` in proxy.ts. Flipping to enforcing requires a
    // preview/staging surface to verify worker-src + 3rd-party loaders
    // (Stockfish, Maia, Privacy & messaging CMP, GA, AdSense) in a real browser.
    const csp = response.headers.get('Content-Security-Policy-Report-Only');
    expect(csp).toBeTruthy();

    // Must NOT also be enforcing — sending both would force the browser to
    // honour the enforcing one, defeating the rollout strategy.
    expect(response.headers.get('Content-Security-Policy')).toBeNull();

    const nonce = capturedRequestHeaders?.get('x-nonce');
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('sets a Report-To header pointing at /api/csp-report', async () => {
    const response = await proxy(makeRequest('/en'));

    const reportTo = response.headers.get('Report-To');
    expect(reportTo).toBeTruthy();
    const parsed = JSON.parse(reportTo as string);
    expect(parsed.group).toBe('csp-endpoint');
    expect(parsed.endpoints).toEqual([{ url: '/api/csp-report' }]);
  });

  it('generates a different nonce on every request', async () => {
    await proxy(makeRequest('/en'));
    const nonceA = capturedRequestHeaders?.get('x-nonce');
    await proxy(makeRequest('/en'));
    const nonceB = capturedRequestHeaders?.get('x-nonce');

    expect(nonceA).toBeTruthy();
    expect(nonceB).toBeTruthy();
    expect(nonceA).not.toBe(nonceB);
  });

  it('returns 404 for WP-probe paths without running the session refresh', async () => {
    const response = await proxy(makeRequest('/wp-login.php'));

    expect(response.status).toBe(404);
    // Session update is skipped, so no nonce is forwarded on the request —
    // but that is fine because the response body is empty JSON and no RSC
    // renders below it.
    expect(capturedRequestHeaders).toBeUndefined();
  });
});

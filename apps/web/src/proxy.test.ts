import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `proxy.ts` is the global edge middleware for the app. These tests pin
 * down the behaviors that must hold for every request that flows through
 * it:
 *
 *   1. The response carries a `Content-Security-Policy-Report-Only` header
 *      (and NOT an enforcing `Content-Security-Policy` — sending both would
 *      make the browser honour the enforcing one). The policy was downgraded
 *      to Report-Only in c6805b993; see the comment on `applyCspHeaders` in
 *      proxy.ts and GitHub issue #89 for the path back to enforcing.
 *   2. Dynamic routes get the per-request-nonce `script-src` variant (a
 *      fresh nonce per request); prerendered content routes get the
 *      static-content variant, whose cached HTML cannot carry a nonce. Next
 *      extracts the nonce from this response header to stamp its own
 *      scripts during a dynamic render — no Server Component reads it, so
 *      no `x-nonce` request header exists anymore.
 *   3. The response carries a `Report-To` header pointing at the
 *      `/api/csp-report` collector.
 *
 * `updateSession` is mocked so the tests do not require a live Supabase
 * instance. We echo back `requestHeaders` from the call so assertions can
 * verify what the forwarded request carries.
 */

let capturedRequestHeaders: Headers | undefined;
let mockAuthenticated = false;

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(
    async (_request: NextRequest, options: { requestHeaders?: Headers } = {}) => {
      capturedRequestHeaders = options.requestHeaders;
      const init = options.requestHeaders
        ? { request: { headers: options.requestHeaders } }
        : undefined;
      return { response: NextResponse.next(init), authenticated: mockAuthenticated, userId: null };
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

vi.mock('@sentry/nextjs');

// Import AFTER the mock above so the module picks up the mocked dependency.
const { proxy } = await import('./proxy');

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'https://example.test'));
}

function scriptSrcOf(response: Response): string | undefined {
  return response.headers
    .get('Content-Security-Policy-Report-Only')
    ?.split('; ')
    .find((d) => d.startsWith('script-src '));
}

describe('proxy', () => {
  beforeEach(() => {
    capturedRequestHeaders = undefined;
    mockAuthenticated = false;
  });

  it('sets a Report-Only CSP header with the per-request-nonce variant on dynamic routes', async () => {
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

    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/]{22,24}={0,2}'/);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('serves the static-content variant (no nonce) on prerendered content routes', async () => {
    // /en/faq is SSG: its cached HTML cannot carry a per-request nonce, so
    // the nonce variant would flag every framework script as a violation.
    const scriptSrc = scriptSrcOf(await proxy(makeRequest('/en/faq')));

    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'nonce-");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc).toContain("'unsafe-inline'");
  });

  it('keeps the nonce variant on auth-carrying surfaces', async () => {
    for (const path of ['/en/topics', '/admin', '/en/games/play']) {
      const scriptSrc = scriptSrcOf(await proxy(makeRequest(path)));
      expect(scriptSrc, path).toContain("'nonce-");
      expect(scriptSrc, path).not.toContain("'unsafe-inline'");
    }
  });

  it('generates a different nonce on every request', async () => {
    const cspA = (await proxy(makeRequest('/en'))).headers.get(
      'Content-Security-Policy-Report-Only'
    );
    const cspB = (await proxy(makeRequest('/en'))).headers.get(
      'Content-Security-Policy-Report-Only'
    );
    const nonceOf = (csp: string | null) => csp?.match(/'nonce-([^']+)'/)?.[1];

    expect(nonceOf(cspA)).toBeTruthy();
    expect(nonceOf(cspB)).toBeTruthy();
    expect(nonceOf(cspA)).not.toBe(nonceOf(cspB));
  });

  it('no longer forwards an x-nonce request header (no Server Component reads it)', async () => {
    // The old design threaded the nonce through `headers()` into layouts,
    // which forced every route dynamic. The bootstrap scripts are hash-
    // allowed now; reintroducing the header would invite that read back.
    await proxy(makeRequest('/en'));

    expect(capturedRequestHeaders).toBeDefined();
    expect(capturedRequestHeaders?.get('x-nonce')).toBeNull();
  });

  it('sets a Report-To header pointing at /api/csp-report', async () => {
    const response = await proxy(makeRequest('/en'));

    const reportTo = response.headers.get('Report-To');
    expect(reportTo).toBeTruthy();
    const parsed = JSON.parse(reportTo as string);
    expect(parsed.group).toBe('csp-endpoint');
    expect(parsed.endpoints).toEqual([{ url: '/api/csp-report' }]);
  });

  it('returns 404 for WP-probe paths without running the session refresh', async () => {
    const response = await proxy(makeRequest('/wp-login.php'));

    expect(response.status).toBe(404);
    expect(capturedRequestHeaders).toBeUndefined();
  });

  describe('post-auth return target', () => {
    const locationOf = (response: Response) => new URL(response.headers.get('location') as string);

    it('remembers the blocked destination when sending a guest to sign-in', async () => {
      const location = locationOf(await proxy(makeRequest('/en/mypage/coins?page=2')));

      expect(location.pathname).toBe('/en/sign-in');
      expect(location.searchParams.get('next')).toBe('/en/mypage/coins?page=2');
    });

    it('drops the RSC payload parameter from the return target', async () => {
      // A soft navigation fetches `?_rsc=<hash>`; carrying it through would
      // make the post-sign-in landing request the payload, not the page.
      const location = locationOf(await proxy(makeRequest('/en/mypage?_rsc=1a2b3c')));

      expect(location.searchParams.get('next')).toBe('/en/mypage');
    });

    it('honours the return target when an already-authenticated visitor lands on sign-in', async () => {
      mockAuthenticated = true;

      const location = locationOf(
        await proxy(makeRequest('/en/sign-in?next=%2Fen%2Fgames%2Fplay%2Fresult%3FgameId%3Dabc'))
      );

      expect(location.pathname).toBe('/en/games/play/result');
      expect(location.searchParams.get('gameId')).toBe('abc');
    });

    it('falls back to mypage rather than looping when the return target is sign-in itself', async () => {
      mockAuthenticated = true;

      const location = locationOf(await proxy(makeRequest('/en/sign-in?next=%2Fen%2Fsign-in')));

      expect(location.pathname).toBe('/en/mypage');
      expect(location.searchParams.get('toast')).toBe('already_logged_in');
    });

    it('refuses an off-origin return target', async () => {
      mockAuthenticated = true;

      const location = locationOf(await proxy(makeRequest('/en/sign-in?next=%2F%2Fevil.com')));

      expect(location.host).toBe('example.test');
      expect(location.pathname).toBe('/en/mypage');
    });
  });
});

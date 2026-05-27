import { NextRequest, NextResponse } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { proxy } from '../src/proxy';

/**
 * Integration test for the proxy's `bfc_ads_hidden` cookie refresh on the
 * Stripe-success landing path.
 *
 * Unlike `proxy.test.ts`, this file does NOT mock
 * `@/lib/ads/ads-hidden-cookie-writer`. Instead, the *real* writer runs and
 * we mock the entitlement compute (`computeAdsHiddenValueForUser`). This
 * verifies the end-to-end response-cookie mutation pipeline:
 *
 *   proxy → refreshAdsHiddenCookieOnResponse → response.cookies.{set,delete}
 *
 * Coverage required by the Reviewer (#3):
 *   - Stripe-success landing for an authenticated subscribed user
 *     ⇒ response.cookies.set('bfc_ads_hidden', '1', ...)
 *   - Same path for an authenticated non-subscribed user
 *     ⇒ response.cookies.delete('bfc_ads_hidden')
 *   - Locale-agnostic matching (en + ja)
 */

const mockUpdateSession = vi.fn();
const mockComputeAdsHiddenValueForUser = vi.fn();
const mockCaptureException = vi.fn();

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}));

// `computeAdsHiddenValueForUser` is `server-only`; vitest will choke on the
// import unless we either silence `server-only` or mock the module entirely.
// We mock the whole module so the real DB calls underneath are never reached.
vi.mock('@/lib/ads/ads-hidden-cookie-compute', () => ({
  computeAdsHiddenValueForUser: (...args: unknown[]) => mockComputeAdsHiddenValueForUser(...args),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

describe('proxy — Stripe-success ads-hidden cookie integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets bfc_ads_hidden=1 on /en/mypage/subscription?status=success for a subscribed user', async () => {
    const mockResponse = NextResponse.next();
    const setSpy = vi.spyOn(mockResponse.cookies, 'set');
    const deleteSpy = vi.spyOn(mockResponse.cookies, 'delete');
    mockUpdateSession.mockResolvedValue({
      response: mockResponse,
      authenticated: true,
      userId: 'user-paying',
    });
    mockComputeAdsHiddenValueForUser.mockResolvedValue('1');

    const request = createRequest('/en/mypage/subscription?status=success');
    const result = await proxy(request);

    expect(result).toBe(mockResponse);
    expect(mockComputeAdsHiddenValueForUser).toHaveBeenCalledWith('user-paying');
    expect(setSpy).toHaveBeenCalledWith(
      'bfc_ads_hidden',
      '1',
      expect.objectContaining({
        path: '/',
        sameSite: 'lax',
        httpOnly: false,
        maxAge: expect.any(Number),
      })
    );
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('deletes bfc_ads_hidden on /en/mypage/subscription?status=success for a NON-subscribed user', async () => {
    const mockResponse = NextResponse.next();
    const setSpy = vi.spyOn(mockResponse.cookies, 'set');
    const deleteSpy = vi.spyOn(mockResponse.cookies, 'delete');
    mockUpdateSession.mockResolvedValue({
      response: mockResponse,
      authenticated: true,
      userId: 'user-free',
    });
    mockComputeAdsHiddenValueForUser.mockResolvedValue(null);

    const request = createRequest('/en/mypage/subscription?status=success');
    const result = await proxy(request);

    expect(result).toBe(mockResponse);
    expect(mockComputeAdsHiddenValueForUser).toHaveBeenCalledWith('user-free');
    expect(deleteSpy).toHaveBeenCalledWith('bfc_ads_hidden');
    // Sanity: no `set` for the ads-hidden cookie was issued on the
    // non-subscribed-user path. Other cookies (Supabase session) may still
    // be set by `updateSession`, so we only filter to our cookie name.
    expect(setSpy.mock.calls.some((c) => c[0] === 'bfc_ads_hidden')).toBe(false);
  });

  it('sets bfc_ads_hidden=1 on /ja/mypage/subscription?status=success (locale-agnostic)', async () => {
    const mockResponse = NextResponse.next();
    const setSpy = vi.spyOn(mockResponse.cookies, 'set');
    mockUpdateSession.mockResolvedValue({
      response: mockResponse,
      authenticated: true,
      userId: 'user-jp',
    });
    mockComputeAdsHiddenValueForUser.mockResolvedValue('1');

    const request = createRequest('/ja/mypage/subscription?status=success');
    const result = await proxy(request);

    expect(result).toBe(mockResponse);
    expect(mockComputeAdsHiddenValueForUser).toHaveBeenCalledWith('user-jp');
    expect(setSpy).toHaveBeenCalledWith(
      'bfc_ads_hidden',
      '1',
      expect.objectContaining({ path: '/', sameSite: 'lax' })
    );
  });

  it('deletes bfc_ads_hidden on /ja/mypage/subscription?status=success for a NON-subscribed user (locale-agnostic)', async () => {
    const mockResponse = NextResponse.next();
    const deleteSpy = vi.spyOn(mockResponse.cookies, 'delete');
    mockUpdateSession.mockResolvedValue({
      response: mockResponse,
      authenticated: true,
      userId: 'user-jp-free',
    });
    mockComputeAdsHiddenValueForUser.mockResolvedValue(null);

    const request = createRequest('/ja/mypage/subscription?status=success');
    const result = await proxy(request);

    expect(result).toBe(mockResponse);
    expect(deleteSpy).toHaveBeenCalledWith('bfc_ads_hidden');
  });
});

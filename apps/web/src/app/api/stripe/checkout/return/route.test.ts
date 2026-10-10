import { captureMessage } from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticateAndGuardApi as mockGuard } from '@/lib/__mocks__/auth';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockSessionsRetrieve = vi.fn();
const mockGetStripeCustomerId = vi.fn();
const mockUpsert = vi.fn();
const mockRefreshCookie = vi.fn();
const mockCaptureError = vi.fn();
const mockCaptureMessage = vi.mocked(captureMessage);

vi.mock('@/lib/auth');

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { retrieve: (...args: unknown[]) => mockSessionsRetrieve(...args) } },
  }),
}));

vi.mock('@/lib/billing/stripe-customer', () => ({
  getStripeCustomerId: (...args: unknown[]) => mockGetStripeCustomerId(...args),
}));

vi.mock('@/lib/billing/stripe-webhook-handlers', () => ({
  upsertSubscriptionMirror: (...args: unknown[]) => mockUpsert(...args),
}));

vi.mock('@/lib/ads/ads-hidden-cookie-writer', () => ({
  refreshAdsHiddenCookieOnResponse: (...args: unknown[]) => mockRefreshCookie(...args),
}));

// The route reads `RATE_LIMITS.checkoutReturn`; the shared mock re-exports
// the real table so the assertion below is against the config that ships.
// Its actual import reaches `@/lib/db`, which builds a client at import time,
// hence the schema-only double.
vi.mock('@/lib/security/rate-limit');
vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {},
}));

vi.mock('@/lib/sentry/capture-error', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

vi.mock('@sentry/nextjs');

vi.mock('@/config', () => ({
  DEFAULT_LOCALE: 'en',
  IS_LOCAL_DEV: true,
  SUPPORTED_LOCALES: ['en', 'es', 'pt-BR', 'ja'] as const,
}));

const { GET } = await import('./route');

const USER = { id: 'user-1', email: 'u@example.com' };

function completedSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_1',
    status: 'complete',
    mode: 'subscription',
    customer: 'cus_own',
    subscription: { id: 'sub_1', status: 'active' },
    ...overrides,
  };
}

function get(query: string): Promise<Response> {
  return GET(new Request(`https://app.example.com/api/stripe/checkout/return${query}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGuard.mockResolvedValue({ user: USER });
  mockGetStripeCustomerId.mockResolvedValue('cus_own');
  mockSessionsRetrieve.mockResolvedValue(completedSession());
  mockUpsert.mockResolvedValue(undefined);
  mockRefreshCookie.mockResolvedValue(undefined);
});

describe('GET /api/stripe/checkout/return', () => {
  it('mirrors the subscription, sets the ad-hide cookie and lands on the success page', async () => {
    const response = await get('?locale=ja&session_id=cs_test_1');

    expect(mockSessionsRetrieve).toHaveBeenCalledWith('cs_test_1', { expand: ['subscription'] });
    expect(mockGuard).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'checkout_return', maxAttempts: 10 })
    );
    expect(mockUpsert).toHaveBeenCalledWith('user-1', { id: 'sub_1', status: 'active' });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://app.example.com/ja/mypage/subscription?status=success'
    );
    expect(response.headers.get('set-cookie')).toMatch(/^bfc_ads_hidden=1;/);
    // The cookie came from the subscription just mirrored, not from the
    // cache that may still hold the pre-purchase answer.
    expect(mockRefreshCookie).not.toHaveBeenCalled();
  });

  it('refuses a session whose customer is not the signed-in user with 403 and mirrors nothing', async () => {
    mockSessionsRetrieve.mockResolvedValue(completedSession({ customer: 'cus_someone_else' }));

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.status).toBe(403);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('cs_test_1'),
      'warning'
    );
  });

  it('refuses when the signed-in user has no Stripe customer at all', async () => {
    mockGetStripeCustomerId.mockResolvedValue(null);

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.status).toBe(403);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('accepts the customer when Stripe returns it as an expanded object', async () => {
    mockSessionsRetrieve.mockResolvedValue(completedSession({ customer: { id: 'cus_own' } }));

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.status).toBe(307);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it('sends an anonymous visitor to sign in with the subscription page as the return target', async () => {
    const { NextResponse } = await import('next/server');
    mockGuard.mockResolvedValue({
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    });

    const response = await get('?locale=ja&session_id=cs_test_1');

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location') ?? '');
    expect(location.pathname).toBe('/ja/sign-in');
    expect(location.searchParams.get('next')).toBe('/ja/mypage/subscription');
    expect(mockSessionsRetrieve).not.toHaveBeenCalled();
  });

  it('passes a banned or rate-limited guard response through unchanged', async () => {
    const { NextResponse } = await import('next/server');
    mockGuard.mockResolvedValue({
      response: NextResponse.json({ error: 'rateLimited' }, { status: 429 }),
    });

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.status).toBe(429);
    expect(mockSessionsRetrieve).not.toHaveBeenCalled();
  });

  it('redirects to the subscription page without a success banner when no session id is given', async () => {
    const response = await get('?locale=en');

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.com/en/mypage/subscription');
    expect(mockSessionsRetrieve).not.toHaveBeenCalled();
  });

  it('rejects a session id that does not look like one before asking Stripe', async () => {
    const response = await get('?locale=en&session_id=%7BCHECKOUT_SESSION_ID%7D');

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.com/en/mypage/subscription');
    expect(mockSessionsRetrieve).not.toHaveBeenCalled();
  });

  it('shows no success banner for a session that has not completed', async () => {
    mockSessionsRetrieve.mockResolvedValue(
      completedSession({ status: 'open', subscription: null })
    );

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.headers.get('location')).toBe('https://app.example.com/en/mypage/subscription');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('falls back to the cached cookie computation when the mirrored subscription is not yet benefit-active', async () => {
    mockSessionsRetrieve.mockResolvedValue(
      completedSession({ subscription: { id: 'sub_1', status: 'incomplete' } })
    );

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockRefreshCookie).toHaveBeenCalledWith(expect.anything(), 'user-1');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('still lands on the page when Stripe cannot be reached, leaving the webhook to mirror', async () => {
    mockSessionsRetrieve.mockRejectedValue(new Error('stripe down'));

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.com/en/mypage/subscription');
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
  });

  it('still lands on the success page when the mirror write fails, with the cookie recomputed', async () => {
    mockUpsert.mockRejectedValue(new Error('db down'));

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.headers.get('location')).toBe(
      'https://app.example.com/en/mypage/subscription?status=success'
    );
    expect(mockCaptureError).toHaveBeenCalledTimes(1);
    expect(mockRefreshCookie).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('still lands on the success page when the cookie recompute fails, and reports it', async () => {
    mockSessionsRetrieve.mockResolvedValue(
      completedSession({ subscription: { id: 'sub_1', status: 'incomplete' } })
    );
    const refreshError = new Error('cookie compute failed');
    mockRefreshCookie.mockRejectedValue(refreshError);

    const response = await get('?locale=en&session_id=cs_test_1');

    expect(response.headers.get('location')).toBe(
      'https://app.example.com/en/mypage/subscription?status=success'
    );
    expect(mockCaptureError).toHaveBeenCalledWith(refreshError, expect.any(String));
  });

  it('falls back to the default locale for an unsupported locale parameter', async () => {
    const response = await get('?locale=..%2Fadmin&session_id=cs_test_1');

    expect(response.headers.get('location')).toBe(
      'https://app.example.com/en/mypage/subscription?status=success'
    );
  });
});

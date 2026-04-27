import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression test for the Stripe Checkout `success_url`.
 *
 * The proxy at `apps/web/src/proxy.ts` refreshes the `bfc_ads_hidden`
 * cookie ONLY when the request path matches `/<locale>/mypage/subscription`
 * (with optional query string). If `success_url` ever drifts to a different
 * path — e.g., `/<locale>/mypage` directly, or `/checkout/return` — the
 * cookie refresh on Stripe-success silently stops working and paying users
 * see ads until the next page navigation routes them through the proxy
 * predicate.
 *
 * This test pins the URL shape so any future change has to update the
 * assertion explicitly. It mocks the Stripe SDK and asserts what is passed
 * to `stripe.checkout.sessions.create`.
 */

const mockGetAuthenticatedUser = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetOrCreateStripeCustomerId = vi.fn();
const mockGetStripePriceId = vi.fn(() => 'price_test_123');
const mockSessionsCreate = vi.fn();
const mockRedirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    // Match Next's runtime behaviour: `redirect()` throws so callers stop
    // execution. We throw a sentinel error so tests can ignore it.
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(...args),
}));

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: () => ({
    checkout: { sessions: { create: (...args: unknown[]) => mockSessionsCreate(...args) } },
  }),
  getStripePriceId: () => mockGetStripePriceId(),
}));

vi.mock('@/lib/billing/stripe-customer', () => ({
  getOrCreateStripeCustomerId: (...args: unknown[]) => mockGetOrCreateStripeCustomerId(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    createCheckoutSession: {
      action: 'create_checkout_session',
      maxAttempts: 5,
      windowMs: 600_000,
    },
  },
}));

// `createCheckoutSession.ts` reads `SITE_URL` from `@/config` at the top of
// the module. We pin it so the regression assertion below is deterministic
// regardless of `process.env.NEXT_PUBLIC_SITE_URL` in the test runner.
vi.mock('@/config', () => ({
  SITE_URL: 'https://test.example.com',
}));

const { createCheckoutSession } = await import('./createCheckoutSession');

describe('createCheckoutSession — Stripe success_url regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-123', email: 'u@example.com' });
    mockCheckRateLimit.mockResolvedValue({ success: true });
    mockGetOrCreateStripeCustomerId.mockResolvedValue('cus_test_123');
    mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_xyz' });
  });

  it('passes success_url=<SITE_URL>/<locale>/mypage/subscription?status=success for en', async () => {
    await expect(createCheckoutSession('en')).rejects.toThrow('NEXT_REDIRECT');

    expect(mockSessionsCreate).toHaveBeenCalledTimes(1);
    const params = mockSessionsCreate.mock.calls[0][0];
    expect(params.success_url).toBe(
      'https://test.example.com/en/mypage/subscription?status=success'
    );
  });

  it('passes success_url=<SITE_URL>/<locale>/mypage/subscription?status=success for ja', async () => {
    await expect(createCheckoutSession('ja')).rejects.toThrow('NEXT_REDIRECT');

    const params = mockSessionsCreate.mock.calls[0][0];
    expect(params.success_url).toBe(
      'https://test.example.com/ja/mypage/subscription?status=success'
    );
  });

  it('passes success_url=<SITE_URL>/<locale>/mypage/subscription?status=success for pt-BR (region-qualified locale)', async () => {
    await expect(createCheckoutSession('pt-BR')).rejects.toThrow('NEXT_REDIRECT');

    const params = mockSessionsCreate.mock.calls[0][0];
    expect(params.success_url).toBe(
      'https://test.example.com/pt-BR/mypage/subscription?status=success'
    );
  });

  it('the success_url path matches the proxy predicate (/<locale>/mypage/subscription)', async () => {
    // This is the load-bearing regression: the `success_url` path (post-
    // origin, pre-query) MUST satisfy
    //   /^/[^/]+/mypage/subscription(/.*)?$/
    // — the same pattern the proxy uses to gate the cookie refresh
    // (`isAdsCookieRefreshPath` in `apps/web/src/proxy.ts`). If this
    // assertion fails, paying users will see ads after returning from
    // Stripe.
    await expect(createCheckoutSession('en')).rejects.toThrow('NEXT_REDIRECT');

    const params = mockSessionsCreate.mock.calls[0][0];
    const url = new URL(params.success_url);
    const proxyPredicate = /^\/[^/]+\/mypage\/subscription(\/.*)?$/;
    expect(proxyPredicate.test(url.pathname)).toBe(true);
    expect(url.searchParams.get('status')).toBe('success');
  });

  it('passes the Stripe Checkout subscription mode and price line item', async () => {
    await expect(createCheckoutSession('en')).rejects.toThrow('NEXT_REDIRECT');

    const params = mockSessionsCreate.mock.calls[0][0];
    expect(params.mode).toBe('subscription');
    expect(params.customer).toBe('cus_test_123');
    expect(params.line_items).toEqual([{ price: 'price_test_123', quantity: 1 }]);
    expect(params.subscription_data).toEqual({ metadata: { supabaseUserId: 'user-123' } });
  });

  it('returns rateLimited error before hitting Stripe when the user has exceeded the limit', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({ error: 'rateLimited' });

    const result = await createCheckoutSession('en');

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });
});

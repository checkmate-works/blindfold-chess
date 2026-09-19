import * as Sentry from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { isUserBanned } from '@/lib/moderation/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock } from '@/lib/supabase/__mocks__/server';

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

const mockGetOrCreateStripeCustomerId = vi.fn();
const mockGetStripePriceId = vi.fn(() => 'price_test_123');
const mockSessionsCreate = vi.fn();

vi.mock('next/navigation');

// The real `@/lib/auth` guard runs, driven through its leaves, so the suite
// proves the action consults the ban check rather than that it calls a
// helper by name.
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/moderation/ban');
vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {},
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

vi.mock('@/lib/security/rate-limit');

// `getGlobalScope` is not what this suite asserts on, but `@/lib/db` tags the
// global scope with the pooler mode at import time and is reachable from the
// action's module graph, so the double has to answer it or the import throws.
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  getGlobalScope: () => ({ setTag: vi.fn() }),
}));

// `createCheckoutSession.ts` reads `SITE_URL` from `@/config` at the top of
// the module. We pin it so the regression assertion below is deterministic
// regardless of `process.env.NEXT_PUBLIC_SITE_URL` in the test runner.
vi.mock('@/config', () => ({
  SITE_URL: 'https://test.example.com',
  SUPPORTED_LOCALES: ['en', 'es', 'pt-BR', 'ja'] as const,
}));

const { createCheckoutSession } = await import('./createCheckoutSession');

describe('createCheckoutSession — Stripe success_url regression', () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123', email: 'u@example.com' } } });
    vi.mocked(isUserBanned).mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
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

  it('reports a thrown Stripe error instead of swallowing it', async () => {
    // A checkout that never starts looks exactly like a user who changed
    // their mind: the action returns an error string and the page renders a
    // message. Without this report, a Stripe outage, a revoked key or a price
    // id that no longer exists all read as zero conversions rather than as an
    // incident, for as long as they last.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const stripeError = new Error('No such price: price_test_123');
    mockSessionsCreate.mockRejectedValueOnce(stripeError);

    const result = await createCheckoutSession('en');

    expect(result).toEqual({ error: 'sessionCreationFailed' });
    expect(Sentry.captureException).toHaveBeenCalledWith(stripeError);
  });

  it('reports a failure to resolve the Stripe customer instead of swallowing it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const customerError = new Error('customer lookup failed');
    mockGetOrCreateStripeCustomerId.mockRejectedValueOnce(customerError);

    const result = await createCheckoutSession('en');

    expect(result).toEqual({ error: 'sessionCreationFailed' });
    expect(Sentry.captureException).toHaveBeenCalledWith(customerError);
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('returns rateLimited error before hitting Stripe when the user has exceeded the limit', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' });

    const result = await createCheckoutSession('en');

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it('refuses a banned user before creating a Stripe customer or session', async () => {
    // The action is reachable from the public /pricing page and by direct
    // POST, so the `(protected)` layout's `/banned` redirect never runs for
    // it. Without this check a banned account could pay for a subscription
    // it cannot use.
    vi.mocked(isUserBanned).mockResolvedValueOnce(true);

    const result = await createCheckoutSession('en');

    expect(result).toEqual({ error: 'banned' });
    expect(mockGetOrCreateStripeCustomerId).not.toHaveBeenCalled();
    expect(mockSessionsCreate).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('returns signInRequired for an anonymous caller instead of touching Stripe', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });

    const result = await createCheckoutSession('en');

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockGetOrCreateStripeCustomerId).not.toHaveBeenCalled();
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });
});

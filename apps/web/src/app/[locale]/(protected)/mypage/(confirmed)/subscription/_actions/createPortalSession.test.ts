import * as Sentry from '@sentry/nextjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { isUserBanned } from '@/lib/moderation/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock } from '@/lib/supabase/__mocks__/server';

const mockGetStripeCustomerId = vi.fn();
const mockPortalSessionsCreate = vi.fn();

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
    billingPortal: {
      sessions: { create: (...args: unknown[]) => mockPortalSessionsCreate(...args) },
    },
  }),
}));

vi.mock('@/lib/billing/stripe-customer', () => ({
  getStripeCustomerId: (...args: unknown[]) => mockGetStripeCustomerId(...args),
}));

vi.mock('@/lib/security/rate-limit');

// `@/lib/db` tags the global scope with the pooler mode at import time and is
// reachable from the action's module graph, so the double has to answer it or
// the import throws.
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  getGlobalScope: () => ({ setTag: vi.fn() }),
}));

vi.mock('@/config', () => ({
  SITE_URL: 'https://test.example.com',
  SUPPORTED_LOCALES: ['en', 'es', 'pt-BR', 'ja'] as const,
}));

const { createPortalSession } = await import('./createPortalSession');

describe('createPortalSession', () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-123', email: 'u@example.com' } } });
    vi.mocked(isUserBanned).mockResolvedValue(false);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
    mockGetStripeCustomerId.mockResolvedValue('cus_test_123');
    mockPortalSessionsCreate.mockResolvedValue({
      url: 'https://billing.stripe.com/p/session/test_xyz',
    });
  });

  it('opens the portal for the stored customer and returns to the subscription page', async () => {
    await expect(createPortalSession('ja')).rejects.toThrow('NEXT_REDIRECT');

    expect(mockPortalSessionsCreate).toHaveBeenCalledTimes(1);
    expect(mockPortalSessionsCreate.mock.calls[0][0]).toEqual({
      customer: 'cus_test_123',
      return_url: 'https://test.example.com/ja/mypage/subscription',
    });
  });

  it('refuses a banned user before looking up the Stripe customer', async () => {
    // The `(protected)` layout redirects a banned user away from the
    // subscription page, but the action is a POST endpoint that no layout
    // renders around, so the ban has to be checked here too.
    vi.mocked(isUserBanned).mockResolvedValueOnce(true);

    const result = await createPortalSession('en');

    expect(result).toEqual({ error: 'banned' });
    expect(mockGetStripeCustomerId).not.toHaveBeenCalled();
    expect(mockPortalSessionsCreate).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it('returns signInRequired for an anonymous caller', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });

    const result = await createPortalSession('en');

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockPortalSessionsCreate).not.toHaveBeenCalled();
  });

  it('returns rateLimited before hitting Stripe when the user has exceeded the limit', async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ error: 'rateLimited' });

    const result = await createPortalSession('en');

    expect(result).toEqual({ error: 'rateLimited' });
    expect(mockPortalSessionsCreate).not.toHaveBeenCalled();
  });

  it('returns noSubscription when the user has no Stripe customer', async () => {
    mockGetStripeCustomerId.mockResolvedValueOnce(null);

    const result = await createPortalSession('en');

    expect(result).toEqual({ error: 'noSubscription' });
    expect(mockPortalSessionsCreate).not.toHaveBeenCalled();
  });

  it('reports a thrown Stripe error instead of swallowing it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const stripeError = new Error('portal configuration missing');
    mockPortalSessionsCreate.mockRejectedValueOnce(stripeError);

    const result = await createPortalSession('en');

    expect(result).toEqual({ error: 'portalSessionFailed' });
    expect(Sentry.captureException).toHaveBeenCalledWith(stripeError);
  });
});

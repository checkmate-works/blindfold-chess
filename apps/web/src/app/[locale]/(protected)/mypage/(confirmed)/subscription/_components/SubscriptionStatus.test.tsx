import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Subscription } from '@/lib/db';

import { SubscriptionStatus } from './SubscriptionStatus';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string, values?: Record<string, string>) => {
    if (values) {
      return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), key);
    }
    return key;
  },
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('../_actions/createPortalSession', () => ({
  createPortalSession: vi.fn(),
}));

vi.mock('@/lib/billing/subscription-constants', () => ({
  BENEFIT_ACTIVE_STATUSES: ['active', 'trialing'],
}));

function buildSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    userId: 'user-1',
    stripeSubscriptionId: 'stripe_sub_1',
    stripePriceId: 'price_1',
    status: 'active',
    cancelAtPeriodEnd: false,
    currentPeriodStart: new Date('2026-04-01T00:00:00Z'),
    currentPeriodEnd: new Date('2026-05-01T00:00:00Z'),
    createdAt: new Date('2026-03-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    ...overrides,
  };
}

describe('SubscriptionStatus', () => {
  describe('active subscription (not canceling)', () => {
    it('should show "Next billing date" with the date', () => {
      const subscription = buildSubscription();
      render(<SubscriptionStatus subscription={subscription} locale="en" />);

      expect(screen.getByText('nextBilling')).toBeInTheDocument();
      expect(screen.getByText('statusActive')).toBeInTheDocument();
    });

    it('should NOT show canceling note', () => {
      const subscription = buildSubscription();
      render(<SubscriptionStatus subscription={subscription} locale="en" />);

      expect(screen.queryByText('cancelingNote')).not.toBeInTheDocument();
    });

    it('should display the formatted period end date', () => {
      const subscription = buildSubscription();
      render(<SubscriptionStatus subscription={subscription} locale="en" />);

      const formattedDate = new Date('2026-05-01T00:00:00Z').toLocaleDateString('en');
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });
  });

  describe('canceling subscription (cancelAtPeriodEnd = true)', () => {
    it('should NOT show "Next billing date"', () => {
      const subscription = buildSubscription({ cancelAtPeriodEnd: true });
      render(<SubscriptionStatus subscription={subscription} locale="en" />);

      expect(screen.queryByText('nextBilling')).not.toBeInTheDocument();
    });

    it('should show canceling note', () => {
      const subscription = buildSubscription({ cancelAtPeriodEnd: true });
      render(<SubscriptionStatus subscription={subscription} locale="en" />);

      expect(screen.getByText('cancelingNote')).toBeInTheDocument();
    });

    it('should show "access until" date', () => {
      const subscription = buildSubscription({ cancelAtPeriodEnd: true });
      render(<SubscriptionStatus subscription={subscription} locale="en" />);

      const formattedDate = new Date('2026-05-01T00:00:00Z').toLocaleDateString('en');
      const expectedText = `accessUntil`.replace('{date}', formattedDate);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('should show "Canceling" status badge', () => {
      const subscription = buildSubscription({ cancelAtPeriodEnd: true });
      render(<SubscriptionStatus subscription={subscription} locale="en" />);

      expect(screen.getByText('statusCanceling')).toBeInTheDocument();
    });
  });

  describe('no subscription', () => {
    it('should show the no-subscription state', () => {
      render(<SubscriptionStatus subscription={null} locale="en" />);

      expect(screen.getByText('noSubscription')).toBeInTheDocument();
      expect(screen.getByText('noSubscriptionDescription')).toBeInTheDocument();
    });

    it('should show a link to the pricing page', () => {
      render(<SubscriptionStatus subscription={null} locale="en" />);

      const link = screen.getByText('viewPlans');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/en/pricing');
    });

    it('should NOT show billing or canceling info', () => {
      render(<SubscriptionStatus subscription={null} locale="en" />);

      expect(screen.queryByText('nextBilling')).not.toBeInTheDocument();
      expect(screen.queryByText('cancelingNote')).not.toBeInTheDocument();
      expect(screen.queryByText('manageSubscription')).not.toBeInTheDocument();
    });
  });
});

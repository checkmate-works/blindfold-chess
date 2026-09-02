import { describe, expect, it } from 'vitest';

import {
  BENEFIT_ACTIVE_STATUSES,
  DISPLAYABLE_STATUSES,
  isCancellationScheduled,
  isSubscriptionActive,
} from './subscription-constants';

describe('BENEFIT_ACTIVE_STATUSES', () => {
  it('should contain active and trialing', () => {
    expect(BENEFIT_ACTIVE_STATUSES).toContain('active');
    expect(BENEFIT_ACTIVE_STATUSES).toContain('trialing');
  });

  it('should have exactly 2 statuses', () => {
    expect(BENEFIT_ACTIVE_STATUSES).toHaveLength(2);
  });

  it('should not contain past_due', () => {
    expect(BENEFIT_ACTIVE_STATUSES).not.toContain('past_due');
  });

  it('should not contain canceled', () => {
    expect(BENEFIT_ACTIVE_STATUSES).not.toContain('canceled');
  });
});

describe('DISPLAYABLE_STATUSES', () => {
  it('should contain active, trialing, and past_due', () => {
    expect(DISPLAYABLE_STATUSES).toContain('active');
    expect(DISPLAYABLE_STATUSES).toContain('trialing');
    expect(DISPLAYABLE_STATUSES).toContain('past_due');
  });

  it('should have exactly 3 statuses', () => {
    expect(DISPLAYABLE_STATUSES).toHaveLength(3);
  });

  it('should not contain canceled', () => {
    expect(DISPLAYABLE_STATUSES).not.toContain('canceled');
  });

  it('should not contain unpaid', () => {
    expect(DISPLAYABLE_STATUSES).not.toContain('unpaid');
  });

  it('should be a superset of BENEFIT_ACTIVE_STATUSES', () => {
    for (const status of BENEFIT_ACTIVE_STATUSES) {
      expect(DISPLAYABLE_STATUSES).toContain(status);
    }
  });
});

describe('isSubscriptionActive', () => {
  it('should accept every status that grants benefits', () => {
    for (const status of BENEFIT_ACTIVE_STATUSES) {
      expect(isSubscriptionActive({ status })).toBe(true);
    }
  });

  it('should reject past_due even though it is still displayable', () => {
    expect(isSubscriptionActive({ status: 'past_due' })).toBe(false);
  });

  it('should reject a terminated subscription', () => {
    expect(isSubscriptionActive({ status: 'canceled' })).toBe(false);
  });

  it('should reject a status Stripe may add that we have not opted into', () => {
    expect(isSubscriptionActive({ status: 'paused' })).toBe(false);
  });

  it('should agree with the status list the SQL readers filter on', () => {
    // `hasActiveSubscription` and the admin users query cannot call this
    // predicate — it does not compile to SQL — so they filter on
    // BENEFIT_ACTIVE_STATUSES instead. The two forms must accept the same set.
    for (const status of DISPLAYABLE_STATUSES) {
      expect(isSubscriptionActive({ status })).toBe(
        (BENEFIT_ACTIVE_STATUSES as readonly string[]).includes(status)
      );
    }
  });

  it('should ignore the billing period, so webhook lag cannot revoke benefits', () => {
    const lapsed = { status: 'active', currentPeriodEnd: new Date('2020-01-01T00:00:00Z') };

    expect(isSubscriptionActive(lapsed)).toBe(true);
  });
});

describe('isCancellationScheduled', () => {
  it('should be true while a cancellation is pending', () => {
    expect(isCancellationScheduled({ cancelAt: new Date('2030-01-01T00:00:00Z') })).toBe(true);
  });

  it('should be false for a subscription that renews normally', () => {
    expect(isCancellationScheduled({ cancelAt: null })).toBe(false);
  });

  it('should stay independent of whether the subscription is active', () => {
    // A subscriber who cancelled mid-period keeps their benefits until the
    // period ends: both predicates are true at once, and the card shows
    // "canceling" over a plan that is still working.
    const canceling = { status: 'active', cancelAt: new Date('2030-01-01T00:00:00Z') };

    expect(isSubscriptionActive(canceling)).toBe(true);
    expect(isCancellationScheduled(canceling)).toBe(true);
  });
});

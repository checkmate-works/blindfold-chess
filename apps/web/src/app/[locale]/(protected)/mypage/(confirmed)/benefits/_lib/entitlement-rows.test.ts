import { describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

// `classifyGrantPeriod` lives beside DB-backed helpers; nothing here queries.
vi.mock('@/lib/db', async () => ({ ...(await actualDbSchema()), db: {} }));

const { VISIBLE_GRANT_COUNT, buildEntitlementSummary } = await import('./entitlement-rows');

const NOW = new Date('2026-06-15T00:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);
const NO_SOURCES = { topicPostMap: new Map(), positionMap: new Map() };

function grant(id: string, startsIn: number, expiresIn: number) {
  return {
    id,
    grantType: 'admin_manual',
    sourceType: null,
    sourceId: null,
    startsAt: at(startsIn),
    expiresAt: at(expiresIn),
  };
}

const activeSubscription = {
  status: 'active',
  currentPeriodStart: at(-10),
  currentPeriodEnd: at(20),
};

describe('buildEntitlementSummary', () => {
  it('reports nothing for a user with neither a subscription nor grants', () => {
    expect(
      buildEntitlementSummary({ subscription: null, grants: [], sources: NO_SOURCES, now: NOW })
    ).toEqual({ latestExpiresAt: null, entitlementRows: [], hasMoreGrants: false });
  });

  it('takes the latest horizon across the subscription and active grants only', () => {
    const { latestExpiresAt } = buildEntitlementSummary({
      subscription: activeSubscription,
      grants: [grant('upcoming', 5, 90), grant('active', -1, 30), grant('expired', -60, -1)],
      sources: NO_SOURCES,
      now: NOW,
    });
    // The upcoming grant ends later but is not active yet.
    expect(latestExpiresAt).toEqual(at(30));
  });

  it('ignores a subscription that is not in a benefit-active status', () => {
    const { latestExpiresAt, entitlementRows } = buildEntitlementSummary({
      subscription: { ...activeSubscription, status: 'canceled' },
      grants: [],
      sources: NO_SOURCES,
      now: NOW,
    });
    expect(latestExpiresAt).toBeNull();
    expect(entitlementRows).toEqual([]);
  });

  it('merges the subscription row with grant rows, newest start first', () => {
    const { entitlementRows } = buildEntitlementSummary({
      subscription: activeSubscription,
      grants: [grant('upcoming', 5, 90), grant('expired', -60, -1)],
      sources: NO_SOURCES,
      now: NOW,
    });
    expect(entitlementRows.map((r) => [r.id, r.status, r.sourceLabelKey])).toEqual([
      ['upcoming', 'upcoming', 'admin_manual'],
      ['subscription', 'active', 'subscription'],
      ['expired', 'expired', 'admin_manual'],
    ]);
  });

  it('lists only the visible grants and flags the rest', () => {
    const grants = Array.from({ length: VISIBLE_GRANT_COUNT + 1 }, (_, i) =>
      grant(`g${i}`, -i - 1, 30)
    );
    const summary = buildEntitlementSummary({
      subscription: null,
      grants,
      sources: NO_SOURCES,
      now: NOW,
    });
    expect(summary.entitlementRows).toHaveLength(VISIBLE_GRANT_COUNT);
    expect(summary.hasMoreGrants).toBe(true);
  });
});

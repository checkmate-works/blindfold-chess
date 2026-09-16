import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

/**
 * What these tests hold in place is the agreement between this page and the
 * ad gates: whether the banner says "active" must be decided by
 * `hasAdFreeEntitlement`, not re-derived from the rows this loader happens to
 * fetch. The rows cover subscriptions and `user_grants` only, while the
 * dan-tier belt perk suppresses ads without either — so a dan holder was told
 * the benefit was inactive while their ads were already hidden sitewide.
 *
 * The real `hasAdFreeEntitlement` runs here, with its three sources stubbed
 * one level below it. A loader that goes back to computing the verdict from
 * subscription/grant rows still passes the subscription and grant cases and
 * fails the dan ones, which is the split these tests exist to keep.
 */

const hoisted = vi.hoisted(() => ({
  grantRows: [] as Array<{
    id: string;
    grantType: string;
    sourceType: string | null;
    sourceId: string | null;
    startsAt: Date;
    expiresAt: Date;
  }>,
}));

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => {
      const chain = {
        from: () => chain,
        where: () => chain,
        orderBy: () => Promise.resolve(hoisted.grantRows),
      };
      return chain;
    },
  },
}));

const mockGetUserSubscription = vi.fn();
const mockHasActiveSubscription = vi.fn();
vi.mock('@/lib/billing/subscription', () => ({
  getUserSubscription: (...args: unknown[]) => mockGetUserSubscription(...args),
  hasActiveSubscription: (...args: unknown[]) => mockHasActiveSubscription(...args),
}));

const mockHasActiveGrant = vi.fn();
vi.mock('@/lib/users/user-grants', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('@/lib/users/user-grants')),
  hasActiveGrant: (...args: unknown[]) => mockHasActiveGrant(...args),
}));

const mockHasDanTierRank = vi.fn();
vi.mock('@/lib/users/dan-rank', () => ({
  hasDanTierRank: (...args: unknown[]) => mockHasDanTierRank(...args),
}));

// The source-row lookup is a separate unit with its own tests; every case here
// uses grants whose provenance resolves to nothing linkable.
vi.mock('./resolve-grant-sources', () => ({
  resolveGrantSources: () => Promise.resolve({ topicPostMap: new Map(), positionMap: new Map() }),
}));

const { getBenefitsPageData } = await import('./getBenefitsPageData');

const USER_ID = 'user-1';
const DAY = 24 * 60 * 60 * 1000;

function activeGrantRow(expiresAt: Date) {
  return {
    id: 'grant-1',
    grantType: 'topic_post',
    sourceType: null,
    sourceId: null,
    startsAt: new Date(Date.now() - DAY),
    expiresAt,
  };
}

function activeSubscriptionRow(currentPeriodEnd: Date) {
  return {
    status: 'active',
    currentPeriodStart: new Date(Date.now() - DAY),
    currentPeriodEnd,
  };
}

describe('getBenefitsPageData', () => {
  beforeEach(() => {
    hoisted.grantRows = [];
    mockGetUserSubscription.mockResolvedValue(null);
    mockHasActiveSubscription.mockResolvedValue(false);
    mockHasActiveGrant.mockResolvedValue(false);
    mockHasDanTierRank.mockResolvedValue(false);
  });

  it('reports ad-free as active and permanent for a dan holder with no subscription and no grant', async () => {
    mockHasDanTierRank.mockResolvedValue(true);

    const data = await getBenefitsPageData(USER_ID);

    expect(data.adFreeActive).toBe(true);
    expect(data.adFreePermanent).toBe(true);
    expect(data.latestExpiresAt).toBeNull();
    expect(data.entitlementRows).toEqual([]);
    expect(data.hasMoreGrants).toBe(false);
  });

  it('keeps the dan perk permanent even when a dated source is also active', async () => {
    const periodEnd = new Date(Date.now() + 30 * DAY);
    mockHasDanTierRank.mockResolvedValue(true);
    mockHasActiveSubscription.mockResolvedValue(true);
    mockGetUserSubscription.mockResolvedValue(activeSubscriptionRow(periodEnd));

    const data = await getBenefitsPageData(USER_ID);

    // The subscription's horizon is still reported for the table, but it does
    // not bound the entitlement: the dan perk outlives it.
    expect(data.adFreePermanent).toBe(true);
    expect(data.latestExpiresAt).toEqual(periodEnd);
  });

  it('reports a subscriber as active until the current period ends, with no permanence', async () => {
    const periodEnd = new Date(Date.now() + 30 * DAY);
    mockHasActiveSubscription.mockResolvedValue(true);
    mockGetUserSubscription.mockResolvedValue(activeSubscriptionRow(periodEnd));

    const data = await getBenefitsPageData(USER_ID);

    expect(data.adFreeActive).toBe(true);
    expect(data.adFreePermanent).toBe(false);
    expect(data.latestExpiresAt).toEqual(periodEnd);
    expect(data.entitlementRows).toEqual([
      expect.objectContaining({
        id: 'subscription',
        sourceLabelKey: 'subscription',
        status: 'active',
      }),
    ]);
  });

  it('reports a grant holder as active until the grant expires, with no permanence', async () => {
    const expiresAt = new Date(Date.now() + 7 * DAY);
    hoisted.grantRows = [activeGrantRow(expiresAt)];
    mockHasActiveGrant.mockResolvedValue(true);

    const data = await getBenefitsPageData(USER_ID);

    expect(data.adFreeActive).toBe(true);
    expect(data.adFreePermanent).toBe(false);
    expect(data.latestExpiresAt).toEqual(expiresAt);
    expect(data.entitlementRows).toEqual([
      expect.objectContaining({ id: 'grant-1', sourceLabelKey: 'topic_post', status: 'active' }),
    ]);
  });

  it('reports ad-free as inactive when no source entitles the user', async () => {
    const data = await getBenefitsPageData(USER_ID);

    expect(data.adFreeActive).toBe(false);
    expect(data.adFreePermanent).toBe(false);
    expect(data.latestExpiresAt).toBeNull();
    expect(data.entitlementRows).toEqual([]);
  });

  it('asks the shared ad-free decision point rather than only the rows it fetched', async () => {
    await getBenefitsPageData(USER_ID);

    expect(mockHasActiveSubscription).toHaveBeenCalledWith(USER_ID);
    expect(mockHasActiveGrant).toHaveBeenCalledWith(USER_ID, 'ad_free');
    expect(mockHasDanTierRank).toHaveBeenCalledWith(USER_ID);
  });

  it('still reports an expired grant as inactive when nothing else entitles the user', async () => {
    hoisted.grantRows = [
      {
        id: 'grant-old',
        grantType: 'admin_manual',
        sourceType: null,
        sourceId: null,
        startsAt: new Date(Date.now() - 30 * DAY),
        expiresAt: new Date(Date.now() - DAY),
      },
    ];

    const data = await getBenefitsPageData(USER_ID);

    expect(data.adFreeActive).toBe(false);
    expect(data.latestExpiresAt).toBeNull();
    expect(data.entitlementRows).toEqual([
      expect.objectContaining({ id: 'grant-old', status: 'expired' }),
    ]);
  });
});

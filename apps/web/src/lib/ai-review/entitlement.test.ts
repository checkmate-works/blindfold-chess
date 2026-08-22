import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRecord } from '@/lib/db/schema';

const mockHasActiveSubscription = vi.fn();
vi.mock('@/lib/billing/subscription', () => ({
  hasActiveSubscription: (...args: unknown[]) => mockHasActiveSubscription(...args),
}));

const mockGetPointBalanceSummary = vi.fn();
vi.mock('@/lib/points', () => ({
  AI_REVIEW_POINT_COST: 1,
  getPointBalanceSummary: (...args: unknown[]) => mockGetPointBalanceSummary(...args),
}));

const { resolveAiReviewGenerationState } = await import('./entitlement');

const AUTHOR_ID = 'author-1';

function gameOf(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: 'game-1',
    authorId: AUTHOR_ID,
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    ...overrides,
  } as GameRecord;
}

describe('resolveAiReviewGenerationState', () => {
  beforeEach(() => {
    mockHasActiveSubscription.mockResolvedValue(false);
    mockGetPointBalanceSummary.mockResolvedValue({ total: 0 });
  });

  it('allows the author when they hold an active subscription, without reading the balance', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);

    await expect(resolveAiReviewGenerationState(gameOf(), AUTHOR_ID)).resolves.toEqual({
      kind: 'allowed',
    });
    expect(mockHasActiveSubscription).toHaveBeenCalledWith(AUTHOR_ID);
    expect(mockGetPointBalanceSummary).not.toHaveBeenCalled();
  });

  it('offers the coin price to an unsubscribed author whose balance covers it', async () => {
    mockGetPointBalanceSummary.mockResolvedValue({ total: 3 });

    await expect(resolveAiReviewGenerationState(gameOf(), AUTHOR_ID)).resolves.toEqual({
      kind: 'payable',
      cost: 1,
      balance: 3,
    });
    expect(mockGetPointBalanceSummary).toHaveBeenCalledWith(AUTHOR_ID);
  });

  it('reports the shortfall to an unsubscribed author who cannot pay', async () => {
    await expect(resolveAiReviewGenerationState(gameOf(), AUTHOR_ID)).resolves.toEqual({
      kind: 'insufficient_balance',
      cost: 1,
      balance: 0,
    });
  });

  // Paying cannot buy the right to publish an assessment of someone else's
  // game, so the ownership test must fail before the billing lookup — and must
  // not report the upsell to a viewer who could never generate anyway.
  it.each([
    ['a signed-out viewer', null],
    ['a third party', 'someone-else'],
  ])('blocks %s without consulting billing', async (_label, viewerId) => {
    mockHasActiveSubscription.mockResolvedValue(true);

    await expect(resolveAiReviewGenerationState(gameOf(), viewerId)).resolves.toEqual({
      kind: 'blocked',
      reason: 'not_owner',
    });
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
    expect(mockGetPointBalanceSummary).not.toHaveBeenCalled();
  });

  it('blocks an ineligible game before consulting billing', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);

    await expect(
      resolveAiReviewGenerationState(gameOf({ moves: ['e4', 'e5'] }), AUTHOR_ID)
    ).resolves.toEqual({ kind: 'blocked', reason: 'game_not_eligible' });
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
  });
});

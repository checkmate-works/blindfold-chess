import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRecord } from '@/lib/db/schema';

const mockHasActiveSubscription = vi.fn();
vi.mock('@/lib/billing/subscription', () => ({
  hasActiveSubscription: (...args: unknown[]) => mockHasActiveSubscription(...args),
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
    vi.clearAllMocks();
    mockHasActiveSubscription.mockResolvedValue(false);
  });

  it('allows the author when they hold an active subscription', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);

    await expect(resolveAiReviewGenerationState(gameOf(), AUTHOR_ID)).resolves.toEqual({
      kind: 'allowed',
    });
    expect(mockHasActiveSubscription).toHaveBeenCalledWith(AUTHOR_ID);
  });

  it('asks the author without a subscription to subscribe', async () => {
    await expect(resolveAiReviewGenerationState(gameOf(), AUTHOR_ID)).resolves.toEqual({
      kind: 'subscription_required',
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
  });

  it('blocks an ineligible game before consulting billing', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);

    await expect(
      resolveAiReviewGenerationState(gameOf({ moves: ['e4', 'e5'] }), AUTHOR_ID)
    ).resolves.toEqual({ kind: 'blocked', reason: 'game_not_eligible' });
    expect(mockHasActiveSubscription).not.toHaveBeenCalled();
  });
});

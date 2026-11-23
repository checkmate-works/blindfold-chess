import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hasActiveSubscription } from '@/lib/billing/subscription';
import type { GameRecord } from '@/lib/db/schema';

vi.mock('@/lib/billing/subscription');

const mockHasActiveSubscription = vi.mocked(hasActiveSubscription);

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
  });

  it('allows the author when they hold an active subscription', async () => {
    mockHasActiveSubscription.mockResolvedValue(true);

    await expect(resolveAiReviewGenerationState(gameOf(), AUTHOR_ID)).resolves.toEqual({
      kind: 'allowed',
    });
    expect(mockHasActiveSubscription).toHaveBeenCalledWith(AUTHOR_ID);
  });

  it('blocks an author without a subscription, naming the subscription as the reason', async () => {
    await expect(resolveAiReviewGenerationState(gameOf(), AUTHOR_ID)).resolves.toEqual({
      kind: 'blocked',
      reason: 'subscription_required',
    });
  });

  // Paying cannot buy the right to publish an assessment of someone else's
  // game, so the ownership test must fail before the billing lookup — and must
  // not name the subscription to a viewer who could never generate anyway.
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

import { describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: { select: vi.fn() },
}));

// Imported after the factory — see `reviewed-game-ids.test.ts` for why.
const { db } = await import('@/lib/db');
const { getAiReview, getAiReviewForViewer } = await import('./queries');

const mockDb = vi.mocked(db) as unknown as { select: ReturnType<typeof vi.fn> };

/** Drizzle-style chain for `select().from().where()[.orderBy()|.limit()]`. */
function mockChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => Promise.resolve(rows)),
    limit: vi.fn(() => Promise.resolve(rows)),
  };
  return chain;
}

/**
 * A `game_ai_reviews` row exactly as the rows written before 2026-08-22 look
 * (the shape of the one review in production on that date): a paragraph
 * summary and moment comments without a principle. These rows are never
 * rewritten, so every read path must keep serving them.
 */
const LEGACY_ROW = {
  id: 'review-1',
  gameId: 'game-1',
  locale: 'en',
  content: {
    summary: 'A long paragraph that used to be the whole summary.',
    momentComments: [{ ply: 4, explanation: 'Dropped the knight.', lesson: 'Count first.' }],
    strengths: ['a'],
    weaknesses: ['b'],
    advice: ['c'],
  },
  moments: [],
  summaryStats: {
    totalPlies: 4,
    playerColor: 'white',
    avgCpLossPlayer: 0,
    judgmentCountsPlayer: { best: 2, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  },
  model: 'gpt-5-mini',
  generatedById: null,
  createdAt: new Date('2026-08-17T07:20:36Z'),
};

describe('reviews stored before the list summary and principles', () => {
  it('are served by getAiReview with the paragraph as a one-item list', async () => {
    mockDb.select.mockReturnValue(mockChain([LEGACY_ROW]));

    const review = await getAiReview('game-1', 'en');

    expect(review?.content.summary).toEqual([
      'A long paragraph that used to be the whole summary.',
    ]);
    expect(review?.content.momentComments[0]).toEqual({
      ply: 4,
      explanation: 'Dropped the knight.',
      lesson: 'Count first.',
    });
  });

  it('are served by getAiReviewForViewer the same way', async () => {
    mockDb.select.mockReturnValue(mockChain([LEGACY_ROW]));

    const review = await getAiReviewForViewer('game-1', 'ja');

    expect(review?.locale).toBe('en');
    expect(review?.content.summary).toEqual([
      'A long paragraph that used to be the whole summary.',
    ]);
  });
});

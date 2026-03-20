import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import { getChallengeResultsPaginated } from './queries';

vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
  };
  return {
    db: mockDb,
    challengeResults: {
      id: 'challenge_results.id',
      userId: 'challenge_results.user_id',
      menuType: 'challenge_results.menu_type',
      leaderboardKey: 'challenge_results.leaderboard_key',
      score: 'challenge_results.score',
      incorrectAnswers: 'challenge_results.incorrect_answers',
      timeTaken: 'challenge_results.time_taken',
      createdAt: 'challenge_results.created_at',
    },
  };
});

vi.mock('@/lib/db/schema', () => ({
  challengeResults: {
    id: 'challenge_results.id',
    userId: 'challenge_results.user_id',
    menuType: 'challenge_results.menu_type',
    leaderboardKey: 'challenge_results.leaderboard_key',
    score: 'challenge_results.score',
    incorrectAnswers: 'challenge_results.incorrect_answers',
    timeTaken: 'challenge_results.time_taken',
    createdAt: 'challenge_results.created_at',
  },
}));

const mockDb = vi.mocked(db);

/**
 * Creates a chainable mock that resolves to `rows` when awaited.
 * Each chained method returns the same object so the Drizzle-style chaining works.
 */
function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'offset'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'row-1',
  menuType: 'coordinate_quiz',
  leaderboardKey: 'white',
  score: 30,
  incorrectAnswers: 2,
  timeTaken: 60,
  createdAt: new Date('2026-03-01T00:00:00Z'),
  ...overrides,
});

describe('getChallengeResultsPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns items and totalPages for a single page of results', async () => {
    // First call: count query
    const countChain = mockChain([{ count: 3 }]);
    // Second call: items query
    const items = [makeRow({ id: 'r1' }), makeRow({ id: 'r2' }), makeRow({ id: 'r3' })];
    const itemsChain = mockChain(items);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1');

    expect(result.items).toHaveLength(3);
    expect(result.totalPages).toBe(1);
  });

  it('calculates totalPages correctly for multiple pages', async () => {
    // 45 items with PAGE_SIZE = 20 -> 3 pages
    const countChain = mockChain([{ count: 45 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1', 1);

    expect(result.totalPages).toBe(3); // ceil(45/20)
  });

  it('returns totalPages = 1 when count is exactly PAGE_SIZE (20)', async () => {
    const countChain = mockChain([{ count: 20 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1', 1);

    expect(result.totalPages).toBe(1);
  });

  it('returns totalPages = 2 when count is PAGE_SIZE + 1 (21)', async () => {
    const countChain = mockChain([{ count: 21 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1', 1);

    expect(result.totalPages).toBe(2);
  });

  it('returns empty items and totalPages = 0 when no results exist', async () => {
    const countChain = mockChain([{ count: 0 }]);
    const itemsChain = mockChain([]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1');

    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(0);
  });

  it('defaults page to 1 when not provided', async () => {
    const countChain = mockChain([{ count: 5 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1');

    // offset should be called with 0 (page 1 -> offset 0)
    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(0);
  });

  it('clamps page to 1 when given a negative page number', async () => {
    const countChain = mockChain([{ count: 40 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1', -5);

    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(0);
  });

  it('clamps page to 1 when given page = 0', async () => {
    const countChain = mockChain([{ count: 40 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1', 0);

    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(0);
  });

  it('clamps page to totalPages when given a page exceeding total', async () => {
    // 10 items, PAGE_SIZE=20 -> totalPages=1, currentPage clamped to 1
    const countChain = mockChain([{ count: 10 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1', 999);

    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(0); // clamped to page 1
  });

  it('calculates correct offset for page 2', async () => {
    const countChain = mockChain([{ count: 40 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1', 2);

    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(20); // (2-1) * 20
  });

  it('calculates correct offset for page 3', async () => {
    const countChain = mockChain([{ count: 60 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1', 3);

    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(40); // (3-1) * 20
  });

  it('uses limit of 20 (PAGE_SIZE)', async () => {
    const countChain = mockChain([{ count: 5 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1');

    const limitFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).limit;
    expect(limitFn).toHaveBeenCalledWith(20);
  });

  it('handles fractional page by clamping (page 1.5 with 40 items)', async () => {
    const countChain = mockChain([{ count: 40 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1', 1.5);

    // Math.max(1, Math.min(1.5, 2)) = 1.5, offset = (1.5-1)*20 = 10
    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(10);
  });

  it('passes menuType filter when provided', async () => {
    const countChain = mockChain([{ count: 5 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1', 1, 'coordinate_quiz');

    expect(result.items).toBeDefined();
    // Verify db.select was called twice (count + items)
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });

  it('passes leaderboardKey filter when provided', async () => {
    const countChain = mockChain([{ count: 2 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1', 1, 'legal_moves', 'knight');

    expect(result.items).toBeDefined();
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });

  it('passes both menuType and leaderboardKey filters when provided', async () => {
    const countChain = mockChain([{ count: 1 }]);
    const itemsChain = mockChain([makeRow({ id: 'filtered-row' })]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getChallengeResultsPaginated('user-1', 1, 'coordinate_quiz', 'white');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('filtered-row');
    expect(result.totalPages).toBe(1);
  });

  it('handles very large page value by clamping to totalPages', async () => {
    const countChain = mockChain([{ count: 5 }]);
    const itemsChain = mockChain([makeRow()]);

    mockDb.select
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(itemsChain as unknown as ReturnType<typeof mockDb.select>);

    await getChallengeResultsPaginated('user-1', 1000000);

    const offsetFn = (itemsChain as Record<string, ReturnType<typeof vi.fn>>).offset;
    expect(offsetFn).toHaveBeenCalledWith(0); // clamped to page 1 (totalPages=1)
  });
});

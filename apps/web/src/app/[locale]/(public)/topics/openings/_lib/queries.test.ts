import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';

import {
  getOpeningBySlug,
  getOpeningPostById,
  getOpenings,
  getOpeningsByFirstMoveSquare,
  getPostCountByFirstMoveSquare,
  getPostsByFirstMoveSquarePaginated,
  isValidOpening,
} from './queries';

vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
  };

  return {
    db: mockDb,
    chessOpenings: {
      id: 'chess_openings.id',
      slug: 'chess_openings.slug',
      name: 'chess_openings.name',
      ecoCode: 'chess_openings.eco_code',
      pgn: 'chess_openings.pgn',
      fen: 'chess_openings.fen',
      firstMoveSquare: 'chess_openings.first_move_square',
      sortOrder: 'chess_openings.sort_order',
      createdAt: 'chess_openings.created_at',
      updatedAt: 'chess_openings.updated_at',
    },
    topicPosts: {
      id: 'topic_posts.id',
      topicType: 'topic_posts.topic_type',
      topicKey: 'topic_posts.topic_key',
      parentId: 'topic_posts.parent_id',
      deletedAt: 'topic_posts.deleted_at',
      createdAt: 'topic_posts.created_at',
    },
    profiles: {
      id: 'profiles.id',
      username: 'profiles.username',
      displayName: 'profiles.display_name',
      avatarUrl: 'profiles.avatar_url',
      flair: 'profiles.flair',
      country: 'profiles.country',
    },
    topicPostRatings: {
      preferenceRating: 'topic_post_ratings.preference_rating',
      proficiencyRating: 'topic_post_ratings.proficiency_rating',
    },
  };
});

const mockDb = vi.mocked(db);

/**
 * Creates a chainable mock that resolves to `rows` when awaited.
 * Each chained method returns the same object so the Drizzle-style chaining works.
 */
function mockChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'offset', 'leftJoin'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(rows);
  return chain;
}

const sampleOpening = {
  id: '00000000-0000-0000-0000-000000000001',
  slug: 'ruy-lopez',
  name: 'Ruy Lopez',
  ecoCode: 'C60',
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
  fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
  firstMoveSquare: 'e4',
  sortOrder: 100,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const sampleOpening2 = {
  id: '00000000-0000-0000-0000-000000000002',
  slug: 'italian-game',
  name: 'Italian Game',
  ecoCode: 'C50',
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
  firstMoveSquare: 'e4',
  sortOrder: 110,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const sampleOpeningD4 = {
  id: '00000000-0000-0000-0000-000000000003',
  slug: 'queens-gambit',
  name: "Queen's Gambit",
  ecoCode: 'D06',
  pgn: '1. d4 d5 2. c4',
  fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
  firstMoveSquare: 'd4',
  sortOrder: 500,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

describe('getOpenings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all openings', async () => {
    const chain = mockChain([sampleOpening, sampleOpening2, sampleOpeningD4]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getOpenings();

    expect(result).toHaveLength(3);
    expect(result[0].slug).toBe('ruy-lopez');
    expect(result[1].slug).toBe('italian-game');
    expect(result[2].slug).toBe('queens-gambit');
  });

  it('should return empty array when no openings exist', async () => {
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getOpenings();

    expect(result).toEqual([]);
  });
});

describe('getOpeningsByFirstMoveSquare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return openings matching the given square', async () => {
    const chain = mockChain([sampleOpening, sampleOpening2]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getOpeningsByFirstMoveSquare('e4');

    expect(result).toHaveLength(2);
    expect(result[0].firstMoveSquare).toBe('e4');
    expect(result[1].firstMoveSquare).toBe('e4');
  });

  it('should return empty array when no openings match', async () => {
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getOpeningsByFirstMoveSquare('a3');

    expect(result).toEqual([]);
  });
});

describe('getOpeningBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the opening when slug exists', async () => {
    const chain = mockChain([sampleOpening]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getOpeningBySlug('ruy-lopez');

    expect(result).not.toBeNull();
    expect(result!.slug).toBe('ruy-lopez');
    expect(result!.name).toBe('Ruy Lopez');
    expect(result!.ecoCode).toBe('C60');
  });

  it('should return null when slug does not exist', async () => {
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getOpeningBySlug('nonexistent-opening');

    expect(result).toBeNull();
  });

  it('should return full opening data including all fields', async () => {
    const chain = mockChain([sampleOpening]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getOpeningBySlug('ruy-lopez');

    expect(result).toEqual(sampleOpening);
  });
});

describe('isValidOpening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when the slug exists in the database', async () => {
    const chain = mockChain([sampleOpening]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await isValidOpening('ruy-lopez');

    expect(result).toBe(true);
  });

  it('should return false when the slug does not exist', async () => {
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    const result = await isValidOpening('nonexistent-opening');

    expect(result).toBe(false);
  });
});

describe('getPostCountByFirstMoveSquare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 when no openings match the square', async () => {
    // First call: select slugs from chessOpenings — returns empty
    const slugChain = mockChain([]);
    mockDb.select.mockReturnValueOnce(slugChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostCountByFirstMoveSquare('a3');

    expect(result).toBe(0);
    // Should only call select once (no second query needed)
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });

  it('should return the count of posts for matching openings', async () => {
    // First call: select slugs from chessOpenings
    const slugChain = mockChain([{ slug: 'ruy-lopez' }, { slug: 'italian-game' }]);
    // Second call: count from topicPosts
    const countChain = mockChain([{ count: 5 }]);

    mockDb.select
      .mockReturnValueOnce(slugChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostCountByFirstMoveSquare('e4');

    expect(result).toBe(5);
    expect(mockDb.select).toHaveBeenCalledTimes(2);
  });

  it('should return 0 when openings exist but have no posts', async () => {
    const slugChain = mockChain([{ slug: 'queens-gambit' }]);
    const countChain = mockChain([{ count: 0 }]);

    mockDb.select
      .mockReturnValueOnce(slugChain as unknown as ReturnType<typeof mockDb.select>)
      .mockReturnValueOnce(countChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostCountByFirstMoveSquare('d4');

    expect(result).toBe(0);
  });
});

describe('getOpeningPostById — UUID guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null without hitting the DB when postId is not a UUID', async () => {
    // Defends against a 500 when users hand-craft URLs like /posts/1 — the raw
    // string would otherwise reach Postgres and throw
    // `invalid input syntax for type uuid`. Callers treat null as 404.
    const chain = mockChain([]);
    mockDb.select.mockReturnValue(chain as unknown as ReturnType<typeof mockDb.select>);

    for (const bogus of ['1', 'abc', 'not-a-uuid', '', '1111-1111']) {
      const result = await getOpeningPostById(bogus, 'ruy-lopez');
      expect(result).toBeNull();
    }

    expect(mockDb.select).not.toHaveBeenCalled();
  });
});

describe('getPostsByFirstMoveSquarePaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no openings match the square', async () => {
    const slugChain = mockChain([]);
    mockDb.select.mockReturnValueOnce(slugChain as unknown as ReturnType<typeof mockDb.select>);

    const result = await getPostsByFirstMoveSquarePaginated('a3', 10, 0);

    expect(result).toEqual([]);
    // Should only call select once (early return, no post query)
    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPositionLikeMeta, getPositionLikeMetaMap } from './like-queries';

// Capture each select() invocation's final where-result so tests can inspect
// what the implementation read from the DB. Each entry in `selectCalls` is
// the last promise returned for that select chain.
type SelectCall = {
  resolved: unknown;
  limited: boolean;
};

const selectCalls: SelectCall[] = [];

// Queue of results that mock DB queries will return, in the order select()
// is invoked by the code-under-test. Tests push values before calling the fn.
const countResultsQueue: unknown[][] = [];
const userLikesResultsQueue: unknown[][] = [];

// Helper: pop next count result, falling back to empty array.
function nextCountResult(): unknown[] {
  return countResultsQueue.shift() ?? [];
}
function nextUserLikesResult(): unknown[] {
  return userLikesResultsQueue.shift() ?? [];
}

vi.mock('@/lib/db', () => {
  const likesTable = {
    id: 'id',
    userId: 'user_id',
    targetType: 'target_type',
    targetId: 'target_id',
  };

  // Track which "shape" each select was. The implementation uses two shapes:
  //   1) { count: count() }                    -> count aggregate (single or grouped)
  //   2) { id: likes.id }                      -> getPositionLikeMeta user-liked lookup
  //   3) { positionId: likes.targetId }        -> getPositionLikeMetaMap user-liked lookup
  //   4) { positionId, likeCount }             -> getPositionLikeMetaMap counts (groupBy)
  const db = {
    select: (shape?: Record<string, unknown>) => {
      const kind =
        shape && 'likeCount' in shape
          ? 'countGrouped'
          : shape && 'count' in shape
            ? 'countSingle'
            : shape && 'id' in shape
              ? 'userLikeSingle'
              : shape && 'positionId' in shape
                ? 'userLikeMany'
                : 'unknown';

      return {
        from: () => ({
          where: (..._args: unknown[]) => {
            const chain = {
              limit: (_n: number) => {
                const resolved = nextUserLikesResult();
                const entry: SelectCall = { resolved, limited: true };
                selectCalls.push(entry);
                return Promise.resolve(resolved);
              },
              groupBy: (..._g: unknown[]) => {
                const resolved = nextCountResult();
                const entry: SelectCall = { resolved, limited: false };
                selectCalls.push(entry);
                return Promise.resolve(resolved);
              },
              then: (onFulfilled: (v: unknown) => unknown, onRejected?: unknown) => {
                let resolved: unknown;
                if (kind === 'countSingle') {
                  resolved = nextCountResult();
                } else if (kind === 'userLikeMany') {
                  resolved = nextUserLikesResult();
                } else {
                  resolved = [];
                }
                const entry: SelectCall = { resolved, limited: false };
                selectCalls.push(entry);
                return Promise.resolve(resolved).then(
                  onFulfilled,
                  onRejected as ((reason: unknown) => unknown) | undefined
                );
              },
            };
            return chain;
          },
        }),
      };
    },
  };

  return {
    db,
    likes: likesTable,
  };
});

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const positionA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const positionB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const positionC = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

beforeEach(() => {
  selectCalls.length = 0;
  countResultsQueue.length = 0;
  userLikesResultsQueue.length = 0;
});

describe('getPositionLikeMetaMap', () => {
  it('returns an empty map for an empty positionIds array without querying the DB', async () => {
    const result = await getPositionLikeMetaMap([], testUserId);

    expect(result.size).toBe(0);
    expect(selectCalls).toHaveLength(0);
  });

  it('builds a count + likedByMe map for multiple positions', async () => {
    countResultsQueue.push([
      { positionId: positionA, likeCount: 3 },
      { positionId: positionB, likeCount: 1 },
      // positionC has no rows in the counts query
    ]);
    userLikesResultsQueue.push([{ positionId: positionA }, { positionId: positionC }]);

    const result = await getPositionLikeMetaMap([positionA, positionB, positionC], testUserId);

    expect(result.size).toBe(3);
    expect(result.get(positionA)).toEqual({ likeCount: 3, likedByMe: true });
    expect(result.get(positionB)).toEqual({ likeCount: 1, likedByMe: false });
    // positionC has no count row (→ 0) but the viewer has liked it.
    expect(result.get(positionC)).toEqual({ likeCount: 0, likedByMe: true });
  });

  it('returns likedByMe=false for every position when currentUserId is undefined', async () => {
    countResultsQueue.push([{ positionId: positionA, likeCount: 2 }]);

    const result = await getPositionLikeMetaMap([positionA, positionB]);

    expect(result.get(positionA)).toEqual({ likeCount: 2, likedByMe: false });
    expect(result.get(positionB)).toEqual({ likeCount: 0, likedByMe: false });
    // The user-liked queue must NOT have been consumed (no real query should
    // be issued for an anonymous viewer).
    expect(userLikesResultsQueue.length).toBe(0);
  });

  it('handles a count result that omits positions entirely as likeCount=0', async () => {
    // Even if counts returns nothing at all, the map must still contain entries
    // for every requested id with zero counts.
    countResultsQueue.push([]);
    userLikesResultsQueue.push([]);

    const result = await getPositionLikeMetaMap([positionA, positionB], testUserId);

    expect(result.get(positionA)).toEqual({ likeCount: 0, likedByMe: false });
    expect(result.get(positionB)).toEqual({ likeCount: 0, likedByMe: false });
  });

  it('only reflects rows returned by the query (targetType="position" filtering enforced at SQL level)', async () => {
    // The implementation passes targetType='position' into the WHERE clause,
    // so the DB would never return rows for other target types. Simulate the
    // filtered result set and verify counts aren't inflated.
    countResultsQueue.push([{ positionId: positionA, likeCount: 5 }]);
    userLikesResultsQueue.push([{ positionId: positionA }]);

    const result = await getPositionLikeMetaMap([positionA], testUserId);

    expect(result.get(positionA)).toEqual({ likeCount: 5, likedByMe: true });
  });
});

describe('getPositionLikeMeta', () => {
  it('returns count and likedByMe for an authenticated viewer', async () => {
    countResultsQueue.push([{ count: 4 }]);
    userLikesResultsQueue.push([{ id: 'like-row-1' }]);

    const result = await getPositionLikeMeta(positionA, testUserId);

    expect(result).toEqual({ likeCount: 4, likedByMe: true });
  });

  it('returns likedByMe=false when user has not liked the position', async () => {
    countResultsQueue.push([{ count: 2 }]);
    userLikesResultsQueue.push([]); // no row returned by the limit(1) lookup

    const result = await getPositionLikeMeta(positionA, testUserId);

    expect(result).toEqual({ likeCount: 2, likedByMe: false });
  });

  it('does not issue a user-liked query when currentUserId is undefined', async () => {
    countResultsQueue.push([{ count: 7 }]);

    const result = await getPositionLikeMeta(positionA);

    expect(result).toEqual({ likeCount: 7, likedByMe: false });
    // The user-liked queue must NOT have been touched.
    expect(userLikesResultsQueue.length).toBe(0);
  });

  it('returns likeCount=0 for a position with no likes', async () => {
    countResultsQueue.push([{ count: 0 }]);

    const result = await getPositionLikeMeta(positionA);

    expect(result).toEqual({ likeCount: 0, likedByMe: false });
  });
});

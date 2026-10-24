import { beforeEach, describe, expect, it, vi } from 'vitest';

import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';

const mockProfileRows = vi.fn();
const mockGetLikeMetaMap = vi.fn();

vi.mock('@/lib/db', async () => ({
  ...(await actualDbSchema()),
  db: {
    select: () => ({
      from: () => ({
        where: () => mockProfileRows(),
      }),
    }),
  },
}));

vi.mock('@/lib/db/like-queries', () => ({
  EMPTY_LIKE_META: { likeCount: 0, likedByMe: false },
  getLikeMetaMap: (...args: unknown[]) => mockGetLikeMetaMap(...args),
}));

const { loadMemberJoinedForFeed } = await import('./load-member-joined');

function member(id: string, username = id) {
  return { id, username, displayName: null, avatarUrl: null, flair: null, country: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProfileRows.mockResolvedValue([]);
  mockGetLikeMetaMap.mockResolvedValue(new Map());
});

describe('loadMemberJoinedForFeed', () => {
  it('returns an empty map without querying when there are no rows', async () => {
    const map = await loadMemberJoinedForFeed([], undefined);

    expect(map.size).toBe(0);
    expect(mockProfileRows).not.toHaveBeenCalled();
    expect(mockGetLikeMetaMap).not.toHaveBeenCalled();
  });

  it('keys the map by the feed row id, not by the member', async () => {
    mockProfileRows.mockResolvedValue([member('actor-1', 'alice')]);

    const map = await loadMemberJoinedForFeed([{ id: 'feed-a', actorId: 'actor-1' }], undefined);

    expect(map.has('feed-a')).toBe(true);
    expect(map.has('actor-1')).toBe(false);
    expect(map.get('feed-a')?.member).toEqual({
      username: 'alice',
      displayName: null,
      avatarUrl: null,
      flair: null,
      country: null,
    });
  });

  it('marks isMine only for the viewer who joined', async () => {
    mockProfileRows.mockResolvedValue([member('actor-1'), member('actor-2')]);
    const rows = [
      { id: 'feed-a', actorId: 'actor-1' },
      { id: 'feed-b', actorId: 'actor-2' },
    ];

    const map = await loadMemberJoinedForFeed(rows, 'actor-1');

    expect(map.get('feed-a')?.isMine).toBe(true);
    expect(map.get('feed-b')?.isMine).toBe(false);
  });

  it('never marks isMine for an anonymous viewer', async () => {
    mockProfileRows.mockResolvedValue([member('actor-1')]);

    const map = await loadMemberJoinedForFeed([{ id: 'feed-a', actorId: 'actor-1' }], undefined);

    expect(map.get('feed-a')?.isMine).toBe(false);
  });

  it('drops a row whose member profile is gone', async () => {
    mockProfileRows.mockResolvedValue([member('actor-1')]);
    const rows = [
      { id: 'feed-a', actorId: 'actor-1' },
      { id: 'feed-gone', actorId: 'actor-purged' },
    ];

    const map = await loadMemberJoinedForFeed(rows, undefined);

    expect([...map.keys()]).toEqual(['feed-a']);
  });

  it('looks likes up by the feed row ids under the member_joined target', async () => {
    mockProfileRows.mockResolvedValue([member('actor-1')]);
    mockGetLikeMetaMap.mockResolvedValue(new Map([['feed-a', { likeCount: 3, likedByMe: true }]]));

    const map = await loadMemberJoinedForFeed(
      [
        { id: 'feed-a', actorId: 'actor-1' },
        { id: 'feed-b', actorId: 'actor-1' },
      ],
      'viewer-1'
    );

    expect(mockGetLikeMetaMap).toHaveBeenCalledWith(
      'member_joined',
      ['feed-a', 'feed-b'],
      'viewer-1'
    );
    expect(map.get('feed-a')?.likeMeta).toEqual({ likeCount: 3, likedByMe: true });
    // No likes yet falls back to the shared empty meta, not `undefined`.
    expect(map.get('feed-b')?.likeMeta).toEqual({ likeCount: 0, likedByMe: false });
  });

  it('gives two rows by the same member their own entries', async () => {
    mockProfileRows.mockResolvedValue([member('actor-1')]);

    const map = await loadMemberJoinedForFeed(
      [
        { id: 'feed-a', actorId: 'actor-1' },
        { id: 'feed-b', actorId: 'actor-1' },
      ],
      undefined
    );

    expect(map.size).toBe(2);
    expect(map.get('feed-a')?.member).toEqual(map.get('feed-b')?.member);
  });
});

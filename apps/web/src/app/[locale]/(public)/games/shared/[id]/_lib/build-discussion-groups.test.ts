import { describe, expect, it } from 'vitest';

import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { buildDiscussionGroups } from './build-discussion-groups';

function comment(id: string, ply: number | null, deleted = false): GameCommentItem {
  return {
    id,
    ply,
    parentId: null,
    body: id,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: deleted ? new Date('2026-01-02T00:00:00Z') : null,
    authorId: 'u1',
    author: { username: 'a', displayName: 'A', avatarUrl: null },
    likeCount: 0,
    likedByMe: false,
  };
}

function chunk(id: string, ply: number): GameChunkItem {
  return {
    id,
    ply,
    chunkId: `c-${id}`,
    slug: id,
    title: id,
    description: null,
    representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
    status: 'published' as const,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    suggestedById: 'u1',
    suggester: null,
  };
}

const shape = (gs: ReturnType<typeof buildDiscussionGroups>) =>
  gs.map((g) => ({
    ply: g.ply,
    comments: g.comments.map((c) => c.id),
    chunks: g.chunks.map((c) => c.id),
  }));

describe('buildDiscussionGroups', () => {
  it('leads with whole-game comments, then move groups in ascending ply order', () => {
    const groups = buildDiscussionGroups(
      [comment('w1', null), comment('m5', 5), comment('m2', 2)],
      [chunk('k2', 2)]
    );
    expect(shape(groups)).toEqual([
      { ply: null, comments: ['w1'], chunks: [] },
      { ply: 2, comments: ['m2'], chunks: ['k2'] },
      { ply: 5, comments: ['m5'], chunks: [] },
    ]);
  });

  it('includes a move that has only chunk links (no comments)', () => {
    const groups = buildDiscussionGroups([], [chunk('k3', 3)]);
    expect(shape(groups)).toEqual([{ ply: 3, comments: [], chunks: ['k3'] }]);
  });

  it('drops deleted comments and any anchor left with nothing live', () => {
    const groups = buildDiscussionGroups(
      [comment('m4', 4, true), comment('w-del', null, true)],
      []
    );
    expect(groups).toEqual([]);
  });

  it('returns no groups when there is no activity', () => {
    expect(buildDiscussionGroups([], [])).toEqual([]);
  });
});

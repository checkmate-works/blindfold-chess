import { describe, expect, it } from 'vitest';

import type { GameCommentItem } from '@/lib/db/game-comments';

import { buildGameCommentTree, groupReplies } from './game-comment-tree';

/**
 * The shared-game advice thread. `buildGameCommentTree` is this module's own —
 * roots stay oldest-first, unlike the topic thread's sortable roots — while
 * the flattening and grouping come from `@/lib/comment-tree/shape`.
 */
function comment(overrides: Partial<GameCommentItem> & { id: string }): GameCommentItem {
  return {
    ply: 0,
    parentId: null,
    body: 'body',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    authorId: 'author',
    author: {
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
    },
    likeCount: 0,
    likedByMe: false,
    ...overrides,
  };
}

describe('buildGameCommentTree', () => {
  it('nests replies under their parent and keeps roots oldest-first', () => {
    const tree = buildGameCommentTree([
      comment({ id: 'a' }),
      comment({ id: 'b' }),
      comment({ id: 'a1', parentId: 'a' }),
    ]);

    expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
    expect(tree[0].children.map((n) => n.id)).toEqual(['a1']);
  });

  it('drops replies whose parent is not in the list rather than promoting them', () => {
    const tree = buildGameCommentTree([
      comment({ id: 'a' }),
      comment({ id: 'x', parentId: 'gone' }),
    ]);

    expect(tree.map((n) => n.id)).toEqual(['a']);
  });

  it('keeps a deleted comment that still anchors a live reply', () => {
    const tree = buildGameCommentTree([
      comment({ id: 'a', deletedAt: new Date('2026-01-02') }),
      comment({ id: 'a1', parentId: 'a' }),
    ]);

    expect(tree.map((n) => n.id)).toEqual(['a']);
    expect(tree[0].children.map((n) => n.id)).toEqual(['a1']);
  });

  it('drops a deleted comment with nothing under it', () => {
    const tree = buildGameCommentTree([
      comment({ id: 'a' }),
      comment({ id: 'b', deletedAt: new Date('2026-01-02') }),
    ]);

    expect(tree.map((n) => n.id)).toEqual(['a']);
  });
});

describe('groupReplies', () => {
  it('caps indentation at two levels and attributes deeper replies to their parent', () => {
    const [root] = buildGameCommentTree([
      comment({ id: 'a' }),
      comment({ id: 'a1', parentId: 'a' }),
      comment({
        id: 'a1x',
        parentId: 'a1',
        author: {
          username: 'bob',
          displayName: 'Bob',
          avatarUrl: null,
        },
      }),
      comment({ id: 'a1xy', parentId: 'a1x' }),
    ]);

    const groups = groupReplies(root);

    expect(groups.map((g) => g.first.id)).toEqual(['a1']);
    // Everything below the first-level reply is flattened into one list.
    expect(groups[0].deeper.map((r) => r.node.id)).toEqual(['a1x', 'a1xy']);
    // A direct reply to `first` needs no "@" cue; a deeper one names its parent.
    expect(groups[0].deeper[0].replyToDisplayName).toBeNull();
    expect(groups[0].deeper[1].replyToDisplayName).toBe('Bob');
  });

  it('does not leak a deleted author name through an "in reply to" cue', () => {
    const [root] = buildGameCommentTree([
      comment({ id: 'a' }),
      comment({ id: 'a1', parentId: 'a' }),
      comment({ id: 'a1x', parentId: 'a1', deletedAt: new Date('2026-01-02') }),
      comment({ id: 'a1xy', parentId: 'a1x' }),
    ]);

    const [group] = groupReplies(root);

    expect(group.deeper.map((r) => r.node.id)).toEqual(['a1x', 'a1xy']);
    expect(group.deeper[1].replyToDisplayName).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { buildCommentTree, countDescendants } from './comment-tree';
import type { PostWithReplyMeta } from './shared';

function makePost(overrides: Partial<PostWithReplyMeta> & { id: string }): PostWithReplyMeta {
  const defaults: PostWithReplyMeta = {
    id: overrides.id,
    userId: 'user-default',
    topicType: 'position_puzzle',
    topicKey: 'pos-1',
    parentId: null,
    rootPostId: null,
    content: 'content',
    replyPermission: 'everyone',
    isSpoiler: false,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    author: null,
    replyMeta: { replyCount: 0, latestReplyAt: null, repliers: [], uniqueReplierCount: 0 },
    likeMeta: { likeCount: 0, likedByMe: false },
  } as PostWithReplyMeta;
  return { ...defaults, ...overrides };
}

describe('buildCommentTree', () => {
  it('returns each top-level post as a root with empty children when there are no replies', () => {
    const tree = buildCommentTree([
      makePost({ id: 'a', createdAt: new Date('2026-01-01T00:00:00Z') }),
      makePost({ id: 'b', createdAt: new Date('2026-01-02T00:00:00Z') }),
    ]);

    expect(tree.map((n) => n.id)).toEqual(['b', 'a']); // 'new' sort = createdAt DESC
    expect(tree.every((n) => n.children.length === 0)).toBe(true);
  });

  it('nests a reply under its parent', () => {
    const flat = [
      makePost({ id: 'top', createdAt: new Date('2026-01-01T00:00:00Z') }),
      makePost({
        id: 'r1',
        parentId: 'top',
        rootPostId: 'top',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ];
    const tree = buildCommentTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('top');
    expect(tree[0].children.map((c) => c.id)).toEqual(['r1']);
  });

  it('nests replies recursively (reply-to-reply ends up under the reply, not under the root)', () => {
    const flat = [
      makePost({ id: 'top' }),
      makePost({ id: 'r1', parentId: 'top', rootPostId: 'top' }),
      makePost({ id: 'r1a', parentId: 'r1', rootPostId: 'top' }),
    ];
    const tree = buildCommentTree(flat);

    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('r1');
    expect(tree[0].children[0].children.map((c) => c.id)).toEqual(['r1a']);
  });

  it('preserves input order for siblings (so chronological flat input → chronological children)', () => {
    const flat = [
      makePost({ id: 'top' }),
      makePost({
        id: 'r-old',
        parentId: 'top',
        rootPostId: 'top',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      }),
      makePost({
        id: 'r-new',
        parentId: 'top',
        rootPostId: 'top',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      }),
    ];
    const tree = buildCommentTree(flat);
    expect(tree[0].children.map((c) => c.id)).toEqual(['r-old', 'r-new']);
  });

  it('drops orphaned replies (parentId not in the input)', () => {
    // Defensive: if a parent was deleted at the DB level between the count
    // query and the read, we should not promote orphans to top-level — that
    // would make a reply silently masquerade as a new top-level comment.
    const flat = [
      makePost({ id: 'top' }),
      makePost({ id: 'orphan', parentId: 'gone', rootPostId: 'gone' }),
    ];
    const tree = buildCommentTree(flat);
    expect(tree.map((n) => n.id)).toEqual(['top']);
  });

  it('applies the requested top-level sort while keeping children chronological', () => {
    const flat = [
      makePost({
        id: 'a',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        likeMeta: { likeCount: 1, likedByMe: false },
      }),
      makePost({
        id: 'b',
        createdAt: new Date('2026-01-02T00:00:00Z'),
        likeMeta: { likeCount: 5, likedByMe: false },
      }),
    ];
    const tree = buildCommentTree(flat, 'popular');
    expect(tree.map((n) => n.id)).toEqual(['b', 'a']); // popular: 5 likes first
  });
});

describe('countDescendants', () => {
  it('counts the full subtree, not just direct children', () => {
    const flat = [
      makePost({ id: 'top' }),
      makePost({ id: 'r1', parentId: 'top', rootPostId: 'top' }),
      makePost({ id: 'r1a', parentId: 'r1', rootPostId: 'top' }),
      makePost({ id: 'r2', parentId: 'top', rootPostId: 'top' }),
    ];
    const tree = buildCommentTree(flat);
    expect(countDescendants(tree[0])).toBe(3);
  });

  it('returns 0 for a leaf', () => {
    const tree = buildCommentTree([makePost({ id: 'leaf' })]);
    expect(countDescendants(tree[0])).toBe(0);
  });
});

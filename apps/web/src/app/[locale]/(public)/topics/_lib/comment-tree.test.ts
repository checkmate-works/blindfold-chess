import { describe, expect, it } from 'vitest';

import { buildCommentTree, countDescendants, flattenReplies } from './comment-tree';
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

describe('flattenReplies', () => {
  function alice(id: string, overrides: Partial<PostWithReplyMeta> = {}): PostWithReplyMeta {
    return makePost({
      id,
      author: {
        username: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        flair: null,
        country: null,
      },
      ...overrides,
    });
  }
  function bob(id: string, overrides: Partial<PostWithReplyMeta> = {}): PostWithReplyMeta {
    return makePost({
      id,
      author: {
        username: 'bob',
        displayName: 'Bob',
        avatarUrl: null,
        flair: null,
        country: null,
      },
      ...overrides,
    });
  }

  it('returns an empty list when the root has no children', () => {
    const tree = buildCommentTree([alice('root')]);
    expect(flattenReplies(tree[0])).toEqual([]);
  });

  it('marks direct replies with replyToDisplayName=null (their parent IS the root)', () => {
    const flat = [
      alice('root'),
      bob('r1', { parentId: 'root', rootPostId: 'root' }),
      bob('r2', { parentId: 'root', rootPostId: 'root' }),
    ];
    const tree = buildCommentTree(flat);
    const replies = flattenReplies(tree[0]);
    expect(replies.map((r) => r.node.id)).toEqual(['r1', 'r2']);
    expect(replies.every((r) => r.replyToDisplayName === null)).toBe(true);
  });

  it('attaches the immediate parent displayName for replies whose parent is NOT the root', () => {
    // root (Alice) ← r1 (Bob) ← r1a (Alice) ← r1a1 (Bob)
    const flat = [
      alice('root'),
      bob('r1', { parentId: 'root', rootPostId: 'root' }),
      alice('r1a', { parentId: 'r1', rootPostId: 'root' }),
      bob('r1a1', { parentId: 'r1a', rootPostId: 'root' }),
    ];
    const tree = buildCommentTree(flat);
    const replies = flattenReplies(tree[0]);

    expect(replies.map((r) => ({ id: r.node.id, parent: r.replyToDisplayName }))).toEqual([
      { id: 'r1', parent: null }, // direct reply to root → no @-prefix
      { id: 'r1a', parent: 'Bob' }, // r1's author
      { id: 'r1a1', parent: 'Alice' }, // r1a's author
    ]);
  });

  it('uses DFS pre-order so chain replies stay adjacent (not chronological)', () => {
    // Two top-level reply chains under root:
    //   r1 (older) → r1a → r1b
    //   r2 (newer)
    // DFS: [r1, r1a, r1b, r2] — r1's chain stays together even though r2 is
    // chronologically between r1 and its descendants.
    const flat = [
      alice('root', { createdAt: new Date('2026-01-01T00:00:00Z') }),
      bob('r1', {
        parentId: 'root',
        rootPostId: 'root',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      }),
      alice('r1a', {
        parentId: 'r1',
        rootPostId: 'root',
        createdAt: new Date('2026-01-04T00:00:00Z'),
      }),
      bob('r1b', {
        parentId: 'r1a',
        rootPostId: 'root',
        createdAt: new Date('2026-01-05T00:00:00Z'),
      }),
      bob('r2', {
        parentId: 'root',
        rootPostId: 'root',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      }),
    ];
    const tree = buildCommentTree(flat);
    expect(flattenReplies(tree[0]).map((r) => r.node.id)).toEqual(['r1', 'r1a', 'r1b', 'r2']);
  });

  it('falls back to "Anonymous" when the parent has no displayName/username', () => {
    const root = alice('root');
    const r1 = makePost({ id: 'r1', parentId: 'root', rootPostId: 'root', author: null });
    const r1a = bob('r1a', { parentId: 'r1', rootPostId: 'root' });
    const tree = buildCommentTree([root, r1, r1a]);
    const replies = flattenReplies(tree[0]);
    // r1a's parent is r1, whose author is null → "Anonymous"
    expect(replies.find((r) => r.node.id === 'r1a')?.replyToDisplayName).toBe('Anonymous');
  });
});

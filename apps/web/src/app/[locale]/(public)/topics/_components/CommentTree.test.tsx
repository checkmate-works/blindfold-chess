import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { CommentTree } from './CommentTree';

afterEach(() => {
  cleanup();
});

vi.mock('../_lib/permissions', () => ({
  canUserReply: vi.fn(async () => true),
}));

const commentNodeProps = vi.fn();
vi.mock('./CommentNode', () => ({
  CommentNode: (props: {
    node: { id: string };
    extraContentByPostId?: ReadonlyMap<string, React.ReactNode>;
  }) => {
    commentNodeProps(props);
    const extra = props.extraContentByPostId?.get(props.node.id);
    return (
      <div data-testid={`comment-node-${props.node.id}`}>
        {extra !== undefined && <div data-testid={`extra-${props.node.id}`}>{extra}</div>}
      </div>
    );
  },
}));

const mockToggleLike = vi.fn();
const mockReplyPgn = vi.fn();
const mockReplyFen = vi.fn();
const mockDeletePost = vi.fn();

const i18n = {
  likeNamespace: 'topics.chunks',
  replyNamespace: 'topics.chunks.replies',
  deleteNamespace: 'topics.chunks.deletePost',
};

function makeRoot(id: string): CommentTreeNode {
  return {
    id,
    userId: `user-${id}`,
    topicType: 'chunk',
    topicKey: 'rook-battery',
    parentId: null,
    rootPostId: null,
    content: `body-${id}`,
    replyPermission: 'everyone',
    isSpoiler: false,
    imageAttachmentCount: 0,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    author: {
      username: `u-${id}`,
      displayName: `User ${id}`,
      avatarUrl: null,
      flair: null,
      country: null,
    },
    replyMeta: { replyCount: 0, latestReplyAt: null, repliers: [], uniqueReplierCount: 0 },
    likeMeta: { likeCount: 0, likedByMe: false },
    children: [],
  } as CommentTreeNode;
}

async function renderTree(
  comments: CommentTreeNode[],
  extra?: ReadonlyMap<string, React.ReactNode>
) {
  const ui = await CommentTree({
    comments,
    locale: 'en',
    topicKey: 'rook-battery',
    currentUserId: 'viewer-1',
    enableSpoiler: false,
    redirectPath: '/en/chunks/rook-battery',
    toggleLikeAction: mockToggleLike,
    replyAttachmentActions: { pgn: mockReplyPgn, fen: mockReplyFen },
    deletePostAction: mockDeletePost,
    i18n,
    extraContentByPostId: extra,
  });
  return render(ui);
}

describe('CommentTree — extraContentByPostId contract', () => {
  it('forwards no Map prop to any CommentNode when extraContentByPostId is omitted (back-compat)', async () => {
    commentNodeProps.mockClear();
    const r1 = makeRoot('r1');
    const r2 = makeRoot('r2');

    await renderTree([r1, r2]);

    expect(commentNodeProps).toHaveBeenCalledTimes(2);
    const call1 = commentNodeProps.mock.calls[0][0];
    const call2 = commentNodeProps.mock.calls[1][0];
    expect(call1.extraContentByPostId).toBeUndefined();
    expect(call2.extraContentByPostId).toBeUndefined();
  });

  it('forwards the same Map to every root CommentNode and the test renderer surfaces only the entries whose key matches the node id', async () => {
    commentNodeProps.mockClear();
    const r1 = makeRoot('r1');
    const r2 = makeRoot('r2');
    const card1 = <div data-testid="game-card-r1">Game card for r1</div>;
    const card2 = <div data-testid="image-card-r2">Image card for r2</div>;
    const map = new Map<string, React.ReactNode>([
      [r1.id, card1],
      [r2.id, card2],
    ]);

    await renderTree([r1, r2], map);

    expect(screen.getByTestId('extra-r1')).toBeDefined();
    expect(screen.getByTestId('extra-r2')).toBeDefined();
    expect(screen.getByTestId('game-card-r1')).toBeDefined();
    expect(screen.getByTestId('image-card-r2')).toBeDefined();
    // Both roots receive the SAME map reference — CommentNode is the
    // one that does the per-id lookup, not CommentTree.
    const calls = commentNodeProps.mock.calls.map((c) => c[0]);
    expect(calls[0].extraContentByPostId).toBe(map);
    expect(calls[1].extraContentByPostId).toBe(map);
  });

  it('renders no extra payload for roots whose id is missing from the map', async () => {
    commentNodeProps.mockClear();
    const r1 = makeRoot('r1');
    const r2 = makeRoot('r2');
    const map = new Map<string, React.ReactNode>([
      [r1.id, <span key="x">attached only to r1</span>],
    ]);

    await renderTree([r1, r2], map);

    expect(screen.getByTestId('extra-r1')).toBeDefined();
    expect(screen.queryByTestId('extra-r2')).toBeNull();
  });

  it('does not match unrelated post ids: a map keyed by an absent id renders nothing extra anywhere', async () => {
    commentNodeProps.mockClear();
    const r1 = makeRoot('r1');
    const map = new Map<string, React.ReactNode>([['some-other-id', <span key="x">orphan</span>]]);

    await renderTree([r1], map);

    expect(screen.queryByTestId('extra-r1')).toBeNull();
  });
});

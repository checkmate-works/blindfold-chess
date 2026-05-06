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
  CommentNode: (props: { node: { id: string }; extraContent?: React.ReactNode }) => {
    commentNodeProps(props);
    return (
      <div data-testid={`comment-node-${props.node.id}`}>
        {props.extraContent !== undefined && (
          <div data-testid={`extra-${props.node.id}`}>{props.extraContent}</div>
        )}
      </div>
    );
  },
}));

const mockToggleLike = vi.fn();
const mockCreateReply = vi.fn();
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
    createReplyAction: mockCreateReply,
    deletePostAction: mockDeletePost,
    i18n,
    extraContentByRootId: extra,
  });
  return render(ui);
}

describe('CommentTree — extraContentByRootId contract', () => {
  it('forwards no extraContent prop to any CommentNode when extraContentByRootId is omitted (back-compat)', async () => {
    commentNodeProps.mockClear();
    const r1 = makeRoot('r1');
    const r2 = makeRoot('r2');

    await renderTree([r1, r2]);

    expect(commentNodeProps).toHaveBeenCalledTimes(2);
    const call1 = commentNodeProps.mock.calls[0][0];
    const call2 = commentNodeProps.mock.calls[1][0];
    // The prop is forwarded as `extraContentByRootId?.get(root.id)` which is
    // `undefined` when the map itself is undefined.
    expect(call1.extraContent).toBeUndefined();
    expect(call2.extraContent).toBeUndefined();
  });

  it('forwards a per-root extraContent payload to the matching CommentNode and only that one', async () => {
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
  });

  it('passes extraContent=undefined to roots without a matching map entry', async () => {
    commentNodeProps.mockClear();
    const r1 = makeRoot('r1');
    const r2 = makeRoot('r2');
    const map = new Map<string, React.ReactNode>([
      [r1.id, <span key="x">attached only to r1</span>],
    ]);

    await renderTree([r1, r2], map);

    const calls = commentNodeProps.mock.calls.map((c) => c[0]);
    const r1Props = calls.find((p) => p.node.id === 'r1');
    const r2Props = calls.find((p) => p.node.id === 'r2');
    expect(r1Props.extraContent).toBeDefined();
    expect(r2Props.extraContent).toBeUndefined();
  });

  it('does not match unrelated root ids: a map keyed by an absent id forwards undefined to every root', async () => {
    commentNodeProps.mockClear();
    const r1 = makeRoot('r1');
    const map = new Map<string, React.ReactNode>([['some-other-id', <span key="x">orphan</span>]]);

    await renderTree([r1], map);

    const r1Props = commentNodeProps.mock.calls[0][0];
    expect(r1Props.extraContent).toBeUndefined();
  });
});

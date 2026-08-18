import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CommentTreeNode } from '../_lib/comment-tree';
import { CommentTree } from './CommentTree';
import type { CommentTreeContextValue } from './CommentTreeContext';

vi.mock('../_lib/permissions', () => ({
  canUserReply: vi.fn(async () => true),
}));

// Capture every context value CommentTree mounts a provider with — one per
// thread root. The provider just renders its children so the stub CommentNode
// below still mounts.
const providerValues: CommentTreeContextValue[] = [];
vi.mock('./CommentTreeContext', () => ({
  CommentTreeProvider: ({
    value,
    children,
  }: {
    value: CommentTreeContextValue;
    children: React.ReactNode;
  }) => {
    providerValues.push(value);
    return <>{children}</>;
  },
}));

vi.mock('./CommentNode', () => ({
  CommentNode: ({ node }: { node: { id: string } }) => (
    <div data-testid={`comment-node-${node.id}`} />
  ),
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
  providerValues.length = 0;
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
  it('mounts one provider + CommentNode per thread root', async () => {
    await renderTree([makeRoot('r1'), makeRoot('r2')]);

    expect(providerValues).toHaveLength(2);
    expect(screen.getByTestId('comment-node-r1')).toBeDefined();
    expect(screen.getByTestId('comment-node-r2')).toBeDefined();
  });

  it('leaves extraContentByPostId undefined in context when the prop is omitted', async () => {
    await renderTree([makeRoot('r1'), makeRoot('r2')]);

    expect(providerValues[0].extraContentByPostId).toBeUndefined();
    expect(providerValues[1].extraContentByPostId).toBeUndefined();
  });

  it('threads the same extraContentByPostId Map into every root context', async () => {
    const map = new Map<string, React.ReactNode>([
      ['r1', <div key="r1">card r1</div>],
      ['r2', <div key="r2">card r2</div>],
    ]);

    await renderTree([makeRoot('r1'), makeRoot('r2')], map);

    // Both roots receive the SAME map reference — CommentNode does the
    // per-id lookup, not CommentTree.
    expect(providerValues[0].extraContentByPostId).toBe(map);
    expect(providerValues[1].extraContentByPostId).toBe(map);
  });

  it('threads the per-root rootPostId / canReply alongside the shared values', async () => {
    await renderTree([makeRoot('r1'), makeRoot('r2')]);

    // rootPostId defaults to each root's own id when threadRootPostId is unset.
    expect(providerValues[0].rootPostId).toBe('r1');
    expect(providerValues[1].rootPostId).toBe('r2');
    // Shared values are identical across roots.
    expect(providerValues[0].locale).toBe('en');
    expect(providerValues[0].toggleLikeAction).toBe(mockToggleLike);
  });
});

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommentTreeNode, FlatReply } from '../_lib/comment-tree';
import { CommentNode } from './CommentNode';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

vi.mock('@/app/[locale]/(public)/topics/_components/LikeButton', () => ({
  LikeButton: () => <div data-testid="like-button" />,
}));

vi.mock('@/app/[locale]/(public)/topics/_components/UserAvatar', () => ({
  UserAvatar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-avatar">{children}</div>
  ),
}));

vi.mock('@/app/[locale]/(public)/topics/_components/DeletePostButton', () => ({
  DeletePostButton: () => <button data-testid="delete-button">delete</button>,
}));

vi.mock('@/app/[locale]/(public)/topics/_components/ReplyForm', () => ({
  ReplyForm: ({ replyToUsername }: { replyToUsername?: string }) => (
    <div data-testid="reply-form">replying to {replyToUsername}</div>
  ),
}));

vi.mock('@/app/[locale]/_components/LinkedText', () => ({
  LinkedText: ({ text }: { text: string }) => <>{text}</>,
}));

const mockToggleLike = vi.fn();
const mockCreateReply = vi.fn();
const mockDeletePost = vi.fn();

const i18n = {
  likeNamespace: 'topics.positionPuzzle',
  replyNamespace: 'topics.positionPuzzle.replies',
  deleteNamespace: 'topics.positionPuzzle.deletePost',
};

function makeNode(overrides: Partial<CommentTreeNode> & { id: string }): CommentTreeNode {
  const defaults: CommentTreeNode = {
    id: overrides.id,
    userId: 'user-1',
    topicType: 'position_puzzle',
    topicKey: 'pos-1',
    parentId: null,
    rootPostId: null,
    content: 'hello world',
    replyPermission: 'everyone',
    isSpoiler: false,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    author: {
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      flair: null,
      country: null,
    },
    replyMeta: { replyCount: 0, latestReplyAt: null, repliers: [], uniqueReplierCount: 0 },
    likeMeta: { likeCount: 0, likedByMe: false },
    children: [],
  } as CommentTreeNode;
  return { ...defaults, ...overrides };
}

function renderNode(props: Partial<Parameters<typeof CommentNode>[0]> & { node: CommentTreeNode }) {
  return render(
    <CommentNode
      node={props.node}
      rootPostId={props.rootPostId ?? props.node.id}
      locale="en"
      topicKey="pos-1"
      currentUserId={'currentUserId' in props ? props.currentUserId : 'viewer-1'}
      canReply={props.canReply ?? true}
      enableSpoiler={props.enableSpoiler ?? false}
      redirectPath="/en/practice/puzzle/pos-1"
      toggleLikeAction={mockToggleLike}
      createReplyAction={mockCreateReply}
      deletePostAction={mockDeletePost}
      i18n={i18n}
      flatReplies={props.flatReplies}
      replyToDisplayName={props.replyToDisplayName}
    />
  );
}

describe('CommentNode', () => {
  it('renders the comment body and the reply button when canReply is true and viewer is logged in', () => {
    renderNode({ node: makeNode({ id: 'a', content: 'hello world' }), flatReplies: [] });

    expect(screen.getByText('hello world')).toBeDefined();
    expect(screen.getByText('replyButton')).toBeDefined();
  });

  it('hides the reply button when the viewer is not logged in', () => {
    renderNode({
      node: makeNode({ id: 'a' }),
      currentUserId: undefined,
      canReply: true,
      flatReplies: [],
    });

    expect(screen.queryByText('replyButton')).toBeNull();
  });

  it('hides the reply button when canReply is false (e.g. replyPermission=nobody)', () => {
    renderNode({ node: makeNode({ id: 'a' }), canReply: false, flatReplies: [] });

    expect(screen.queryByText('replyButton')).toBeNull();
  });

  it('toggles an inline ReplyForm under the comment when Reply is clicked', () => {
    renderNode({ node: makeNode({ id: 'a' }), flatReplies: [] });

    expect(screen.queryByTestId('reply-form')).toBeNull();
    fireEvent.click(screen.getByText('replyButton'));
    expect(screen.getByTestId('reply-form')).toBeDefined();
  });

  it('passes the displayName as replyToUsername (so the form shows "Replying to @Alice")', () => {
    renderNode({ node: makeNode({ id: 'a' }), flatReplies: [] });

    fireEvent.click(screen.getByText('replyButton'));
    expect(screen.getByTestId('reply-form').textContent).toContain('Alice');
  });

  describe('flat replies (YouTube-style two-level layout)', () => {
    it('renders each flatReply as a sibling under the root, never recursively', () => {
      const reply1 = makeNode({ id: 'r1', content: 'first reply' });
      const reply2 = makeNode({ id: 'r2', content: 'second reply' });
      const root = makeNode({ id: 'a', content: 'root comment' });
      const flatReplies: FlatReply[] = [
        { node: reply1, replyToDisplayName: null },
        { node: reply2, replyToDisplayName: null },
      ];

      renderNode({ node: root, flatReplies });

      expect(screen.getByText('root comment')).toBeDefined();
      expect(screen.getByText('first reply')).toBeDefined();
      expect(screen.getByText('second reply')).toBeDefined();
    });

    it('shows "@<parent>" only on flat replies whose parent is NOT the root', () => {
      const directReply = makeNode({ id: 'r1', content: 'direct' });
      const midChainReply = makeNode({ id: 'r1a', content: 'mid-chain' });
      const root = makeNode({ id: 'a' });
      const flatReplies: FlatReply[] = [
        { node: directReply, replyToDisplayName: null }, // parent is root → no prefix
        { node: midChainReply, replyToDisplayName: 'Bob' }, // parent is r1 (Bob)
      ];

      renderNode({ node: root, flatReplies });

      // The mid-chain reply gets a "@Bob" prefix above its body. Direct
      // reply gets nothing.
      const prefixes = screen.queryAllByText(/^@/);
      expect(prefixes).toHaveLength(1);
      expect(prefixes[0].textContent).toBe('@Bob');
    });

    it('does NOT recurse into a flat reply (its own .children are ignored at this level)', () => {
      // Even if a flat reply still carries .children in the data (it does —
      // CommentTreeNode is the same shape), CommentNode rendered without
      // `flatReplies` must not render those children. They live in the root's
      // flatReplies list as siblings instead.
      const grandchild = makeNode({ id: 'g', content: 'grandchild' });
      const reply = makeNode({ id: 'r1', content: 'r1', children: [grandchild] });
      const root = makeNode({ id: 'a' });

      renderNode({
        node: root,
        flatReplies: [{ node: reply, replyToDisplayName: null }],
      });

      // r1 renders, but its grandchild does NOT (it would be a sibling in
      // the real flat list, never nested under r1).
      expect(screen.getByText('r1')).toBeDefined();
      expect(screen.queryByText('grandchild')).toBeNull();
    });
  });

  describe('collapse', () => {
    it('shows the collapse button only on the root (when flatReplies is provided)', () => {
      // A flat reply (no flatReplies prop) has no collapse affordance —
      // collapsing a single reply on its own is not a useful action in the
      // YouTube-style layout, where descendants are siblings of the reply.
      renderNode({ node: makeNode({ id: 'a' }), flatReplies: undefined });
      expect(screen.queryByLabelText('collapseAriaLabel')).toBeNull();

      cleanup();

      renderNode({ node: makeNode({ id: 'a' }), flatReplies: [] });
      expect(screen.getByLabelText('collapseAriaLabel')).toBeDefined();
    });

    it('hides body, toolbar, and ALL flat replies when the root is collapsed', () => {
      const reply1 = makeNode({ id: 'r1', content: 'first reply' });
      const reply2 = makeNode({ id: 'r2', content: 'second reply' });
      const root = makeNode({ id: 'a', content: 'root comment' });

      renderNode({
        node: root,
        flatReplies: [
          { node: reply1, replyToDisplayName: null },
          { node: reply2, replyToDisplayName: null },
        ],
      });

      fireEvent.click(screen.getByLabelText('collapseAriaLabel'));

      expect(screen.queryByText('root comment')).toBeNull();
      expect(screen.queryByText('first reply')).toBeNull();
      expect(screen.queryByText('second reply')).toBeNull();
      // 2 replies hidden → label shown, count == flatReplies.length
      expect(screen.getByText('hiddenReplies')).toBeDefined();
      expect(screen.getByLabelText('expandAriaLabel')).toBeDefined();
    });

    it('does NOT show the "N replies hidden" label on a root with no replies', () => {
      renderNode({ node: makeNode({ id: 'a', content: 'lonely' }), flatReplies: [] });

      fireEvent.click(screen.getByLabelText('collapseAriaLabel'));

      expect(screen.queryByText('lonely')).toBeNull();
      expect(screen.queryByText('hiddenReplies')).toBeNull();
    });
  });

  it('renders the spoiler overlay only when enableSpoiler AND node.isSpoiler are both true', () => {
    renderNode({
      node: makeNode({ id: 'a', isSpoiler: true }),
      enableSpoiler: true,
      flatReplies: [],
    });

    expect(screen.getByLabelText('spoiler.overlayAriaLabel')).toBeDefined();
  });

  it('does NOT render spoiler overlay for a node with isSpoiler=false even when enableSpoiler is true', () => {
    renderNode({
      node: makeNode({ id: 'a', isSpoiler: false }),
      enableSpoiler: true,
      flatReplies: [],
    });

    expect(screen.queryByLabelText('spoiler.overlayAriaLabel')).toBeNull();
  });

  it('does NOT render spoiler overlay when enableSpoiler is false even if isSpoiler=true (e.g. position_memory thread)', () => {
    renderNode({
      node: makeNode({ id: 'a', isSpoiler: true }),
      enableSpoiler: false,
      flatReplies: [],
    });

    expect(screen.queryByLabelText('spoiler.overlayAriaLabel')).toBeNull();
  });

  it("renders Delete button only on the viewer's own comment", () => {
    renderNode({
      node: makeNode({ id: 'a', userId: 'viewer-1' }),
      currentUserId: 'viewer-1',
      flatReplies: [],
    });
    expect(screen.getByTestId('delete-button')).toBeDefined();

    cleanup();

    renderNode({
      node: makeNode({ id: 'a', userId: 'someone-else' }),
      currentUserId: 'viewer-1',
      flatReplies: [],
    });
    expect(screen.queryByTestId('delete-button')).toBeNull();
  });
});

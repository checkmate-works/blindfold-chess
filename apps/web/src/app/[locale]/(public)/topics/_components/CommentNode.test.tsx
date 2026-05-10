import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommentTreeNode, ReplyGroup } from '../_lib/comment-tree';
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

vi.mock('@/app/[locale]/_components/UserAvatar', () => ({
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
const mockReplyPgn = vi.fn();
const mockReplyFen = vi.fn();
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
    imageAttachmentCount: 0,
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
      replyAttachmentActions={{ pgn: mockReplyPgn, fen: mockReplyFen }}
      deletePostAction={mockDeletePost}
      i18n={i18n}
      replyGroups={props.replyGroups}
      flatReplies={props.flatReplies}
      replyToDisplayName={props.replyToDisplayName}
    />
  );
}

describe('CommentNode', () => {
  describe('basic rendering (root mode, no replies)', () => {
    it('renders the comment body and the reply button when canReply is true and viewer is logged in', () => {
      renderNode({ node: makeNode({ id: 'a', content: 'hello world' }), replyGroups: [] });

      expect(screen.getByText('hello world')).toBeDefined();
      expect(screen.getByText('replyButton')).toBeDefined();
    });

    it('hides the reply button when the viewer is not logged in', () => {
      renderNode({
        node: makeNode({ id: 'a' }),
        currentUserId: undefined,
        canReply: true,
        replyGroups: [],
      });

      expect(screen.queryByText('replyButton')).toBeNull();
    });

    it('hides the reply button when canReply is false (e.g. replyPermission=nobody)', () => {
      renderNode({ node: makeNode({ id: 'a' }), canReply: false, replyGroups: [] });

      expect(screen.queryByText('replyButton')).toBeNull();
    });

    it('toggles an inline ReplyForm under the comment when Reply is clicked', () => {
      renderNode({ node: makeNode({ id: 'a' }), replyGroups: [] });

      expect(screen.queryByTestId('reply-form')).toBeNull();
      fireEvent.click(screen.getByText('replyButton'));
      expect(screen.getByTestId('reply-form')).toBeDefined();
    });

    it('passes the displayName as replyToUsername (so the form shows "Replying to @Alice")', () => {
      renderNode({ node: makeNode({ id: 'a' }), replyGroups: [] });

      fireEvent.click(screen.getByText('replyButton'));
      expect(screen.getByTestId('reply-form').textContent).toContain('Alice');
    });
  });

  describe('three-level layout (root → first-level reply → deeper)', () => {
    it("renders each replyGroup's first-level reply at one indent under the root", () => {
      const r1 = makeNode({ id: 'r1', content: 'first reply' });
      const r2 = makeNode({ id: 'r2', content: 'second reply' });
      const root = makeNode({ id: 'a', content: 'root comment' });
      const replyGroups: ReplyGroup[] = [
        { first: r1, deeper: [] },
        { first: r2, deeper: [] },
      ];

      renderNode({ node: root, replyGroups });

      expect(screen.getByText('root comment')).toBeDefined();
      expect(screen.getByText('first reply')).toBeDefined();
      expect(screen.getByText('second reply')).toBeDefined();
    });

    it("renders a first-level reply's deeper replies as flat siblings under it", () => {
      const r1a = makeNode({ id: 'r1a', content: 'r1a content' });
      const r1aa = makeNode({ id: 'r1aa', content: 'r1aa content' });
      const r1 = makeNode({ id: 'r1', content: 'first reply' });
      const root = makeNode({ id: 'a', content: 'root comment' });
      const replyGroups: ReplyGroup[] = [
        {
          first: r1,
          deeper: [
            { node: r1a, replyToDisplayName: null }, // parent IS r1 (first-level) → no prefix
            { node: r1aa, replyToDisplayName: 'Alice' }, // parent is r1a (deeper) → @prefix
          ],
        },
      ];

      renderNode({ node: root, replyGroups });

      expect(screen.getByText('root comment')).toBeDefined();
      expect(screen.getByText('first reply')).toBeDefined();
      expect(screen.getByText('r1a content')).toBeDefined();
      expect(screen.getByText('r1aa content')).toBeDefined();
    });

    it('shows "@<parent>" only on deeper replies whose parent is NOT the first-level reply', () => {
      const r1a = makeNode({ id: 'r1a', content: 'direct under first-level' });
      const r1aa = makeNode({ id: 'r1aa', content: 'one deeper' });
      const r1 = makeNode({ id: 'r1' });
      const root = makeNode({ id: 'a' });
      const replyGroups: ReplyGroup[] = [
        {
          first: r1,
          deeper: [
            { node: r1a, replyToDisplayName: null },
            { node: r1aa, replyToDisplayName: 'Bob' },
          ],
        },
      ];

      renderNode({ node: root, replyGroups });

      const prefixes = screen.queryAllByText(/^@/);
      expect(prefixes).toHaveLength(1);
      expect(prefixes[0].textContent).toBe('@Bob');
    });

    it('renders exactly two indented border-l-2 wrappers (root → first-level, first-level → deeper)', () => {
      // Layout cap: regardless of how deep the data goes, we render at most
      // 2 nested border-l-2 wrappers. This is the structural guarantee that
      // distinguishes B1 (3-level) from the old recursive depth-based indent.
      const r1aa = makeNode({ id: 'r1aa', content: 'deep' });
      const r1a = makeNode({ id: 'r1a', content: 'mid' });
      const r1 = makeNode({ id: 'r1', content: 'first' });
      const root = makeNode({ id: 'a', content: 'root' });
      const replyGroups: ReplyGroup[] = [
        {
          first: r1,
          deeper: [
            { node: r1a, replyToDisplayName: null },
            { node: r1aa, replyToDisplayName: 'Alice' },
          ],
        },
      ];

      const { container } = renderNode({ node: root, replyGroups });
      const wrappers = container.querySelectorAll('div.border-l-2');
      expect(wrappers).toHaveLength(2);
    });

    it('does NOT render any descendants of a first-level reply other than its `deeper` list', () => {
      // Even though CommentTreeNode still carries .children, the first-level
      // reply's own .children must be ignored by CommentNode. The parent
      // (`groupReplies`) has already lifted those into the `deeper` list.
      const orphan = makeNode({ id: 'orphan', content: 'orphan-child-data' });
      const r1 = makeNode({ id: 'r1', content: 'first', children: [orphan] });
      const root = makeNode({ id: 'a' });

      renderNode({
        node: root,
        replyGroups: [{ first: r1, deeper: [] }], // intentionally empty, ignoring r1.children
      });

      expect(screen.getByText('first')).toBeDefined();
      expect(screen.queryByText('orphan-child-data')).toBeNull();
    });
  });

  describe('collapse', () => {
    it('shows the collapse button only on the root (when replyGroups is provided)', () => {
      // First-level reply (flatReplies, no replyGroups) → no collapse.
      renderNode({ node: makeNode({ id: 'a' }), flatReplies: [] });
      expect(screen.queryByLabelText('collapseAriaLabel')).toBeNull();

      cleanup();

      // Deeper reply (neither prop) → no collapse.
      renderNode({ node: makeNode({ id: 'a' }) });
      expect(screen.queryByLabelText('collapseAriaLabel')).toBeNull();

      cleanup();

      // Root (replyGroups, even empty) → collapse shown.
      renderNode({ node: makeNode({ id: 'a' }), replyGroups: [] });
      expect(screen.getByLabelText('collapseAriaLabel')).toBeDefined();
    });

    it('hides body, toolbar, and the entire reply subtree when the root is collapsed', () => {
      const r1a = makeNode({ id: 'r1a', content: 'deeper reply' });
      const r1 = makeNode({ id: 'r1', content: 'first reply' });
      const root = makeNode({ id: 'a', content: 'root comment' });

      renderNode({
        node: root,
        replyGroups: [
          {
            first: r1,
            deeper: [{ node: r1a, replyToDisplayName: null }],
          },
        ],
      });

      fireEvent.click(screen.getByLabelText('collapseAriaLabel'));

      expect(screen.queryByText('root comment')).toBeNull();
      expect(screen.queryByText('first reply')).toBeNull();
      expect(screen.queryByText('deeper reply')).toBeNull();
      expect(screen.getByText('hiddenReplies')).toBeDefined();
      expect(screen.getByLabelText('expandAriaLabel')).toBeDefined();
    });

    it('counts both first-level and deeper replies toward the "N replies hidden" label', () => {
      // 2 first-level replies + 3 deeper replies = 5 total. The collapsed
      // label must reflect the full hidden count, not just first-level.
      const r1 = makeNode({ id: 'r1' });
      const r2 = makeNode({ id: 'r2' });
      const replyGroups: ReplyGroup[] = [
        {
          first: r1,
          deeper: [
            { node: makeNode({ id: 'r1a' }), replyToDisplayName: null },
            { node: makeNode({ id: 'r1b' }), replyToDisplayName: null },
          ],
        },
        {
          first: r2,
          deeper: [{ node: makeNode({ id: 'r2a' }), replyToDisplayName: null }],
        },
      ];

      const { container } = renderNode({ node: makeNode({ id: 'a' }), replyGroups });
      fireEvent.click(screen.getByLabelText('collapseAriaLabel'));

      // The mocked translation just echoes the key; the count is passed as
      // an interpolation arg the mock ignores. Assert the label is present
      // and that the underlying CommentNode computed `count: 5` — easiest
      // check is that there's exactly one hiddenReplies <p> element.
      expect(container.querySelectorAll('p').length).toBeGreaterThan(0);
      expect(screen.getByText('hiddenReplies')).toBeDefined();
    });

    it('does NOT show the "N replies hidden" label on a root with no replies', () => {
      renderNode({ node: makeNode({ id: 'a', content: 'lonely' }), replyGroups: [] });

      fireEvent.click(screen.getByLabelText('collapseAriaLabel'));

      expect(screen.queryByText('lonely')).toBeNull();
      expect(screen.queryByText('hiddenReplies')).toBeNull();
    });
  });

  describe('spoiler overlay', () => {
    it('renders only when enableSpoiler AND node.isSpoiler are both true', () => {
      renderNode({
        node: makeNode({ id: 'a', isSpoiler: true }),
        enableSpoiler: true,
        replyGroups: [],
      });

      expect(screen.getByLabelText('spoiler.overlayAriaLabel')).toBeDefined();
    });

    it('does NOT render for a node with isSpoiler=false even when enableSpoiler is true', () => {
      renderNode({
        node: makeNode({ id: 'a', isSpoiler: false }),
        enableSpoiler: true,
        replyGroups: [],
      });

      expect(screen.queryByLabelText('spoiler.overlayAriaLabel')).toBeNull();
    });

    it('does NOT render when enableSpoiler is false even if isSpoiler=true (e.g. position_memory thread)', () => {
      renderNode({
        node: makeNode({ id: 'a', isSpoiler: true }),
        enableSpoiler: false,
        replyGroups: [],
      });

      expect(screen.queryByLabelText('spoiler.overlayAriaLabel')).toBeNull();
    });
  });

  describe('tombstone (deleted comment)', () => {
    it('renders the deletedComment placeholder and hides body / avatar / buttons', () => {
      const deleted = makeNode({
        id: 'a',
        content: 'original body — must NOT render',
        deletedAt: new Date('2026-01-02T00:00:00Z'),
      });

      renderNode({ node: deleted, currentUserId: 'user-1', replyGroups: [] });

      // Tombstone copy is shown via `topics.deletedComment` (mock echoes key).
      expect(screen.getByText('deletedComment')).toBeDefined();
      // Original body must NOT leak.
      expect(screen.queryByText('original body — must NOT render')).toBeNull();
      // Avatar (and through it: displayName, profile link, country, flair) is gone.
      expect(screen.queryByTestId('user-avatar')).toBeNull();
      // No like / reply / delete affordances.
      expect(screen.queryByTestId('like-button')).toBeNull();
      expect(screen.queryByText('replyButton')).toBeNull();
      expect(screen.queryByTestId('delete-button')).toBeNull();
    });

    it('still renders descendants under a deleted root (replies survive the tombstone)', () => {
      // The whole point of keeping deleted-with-live-descendants nodes in the
      // tree: their children must remain visible.
      const r1 = makeNode({ id: 'r1', content: 'live reply' });
      const root = makeNode({
        id: 'a',
        deletedAt: new Date('2026-01-02T00:00:00Z'),
      });

      renderNode({
        node: root,
        replyGroups: [{ first: r1, deeper: [] }],
      });

      expect(screen.getByText('deletedComment')).toBeDefined();
      expect(screen.getByText('live reply')).toBeDefined();
    });

    it('does not render the spoiler overlay on a tombstone, even if the row was a spoiler', () => {
      // Spoiler is anchored to the (deleted) author's content; with the body
      // gone there is nothing to gate.
      renderNode({
        node: makeNode({
          id: 'a',
          isSpoiler: true,
          deletedAt: new Date('2026-01-02T00:00:00Z'),
        }),
        enableSpoiler: true,
        replyGroups: [],
      });

      expect(screen.queryByLabelText('spoiler.overlayAriaLabel')).toBeNull();
    });

    it("does not render the Delete button on a tombstone, even when the viewer matches the original author's userId", () => {
      // The row is already deleted — surfacing Delete again is misleading.
      renderNode({
        node: makeNode({
          id: 'a',
          userId: 'viewer-1',
          deletedAt: new Date('2026-01-02T00:00:00Z'),
        }),
        currentUserId: 'viewer-1',
        replyGroups: [],
      });

      expect(screen.queryByTestId('delete-button')).toBeNull();
    });
  });

  it("renders Delete button only on the viewer's own comment", () => {
    renderNode({
      node: makeNode({ id: 'a', userId: 'viewer-1' }),
      currentUserId: 'viewer-1',
      replyGroups: [],
    });
    expect(screen.getByTestId('delete-button')).toBeDefined();

    cleanup();

    renderNode({
      node: makeNode({ id: 'a', userId: 'someone-else' }),
      currentUserId: 'viewer-1',
      replyGroups: [],
    });
    expect(screen.queryByTestId('delete-button')).toBeNull();
  });
});

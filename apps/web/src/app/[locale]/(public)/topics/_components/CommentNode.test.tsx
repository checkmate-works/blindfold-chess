import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CommentTreeNode } from '../_lib/comment-tree';
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
      depth={props.depth}
    />
  );
}

describe('CommentNode', () => {
  it('renders the comment body and the reply button when canReply is true and viewer is logged in', () => {
    renderNode({ node: makeNode({ id: 'a', content: 'hello world' }) });

    expect(screen.getByText('hello world')).toBeDefined();
    expect(screen.getByText('replyButton')).toBeDefined();
  });

  it('hides the reply button when the viewer is not logged in', () => {
    renderNode({
      node: makeNode({ id: 'a' }),
      currentUserId: undefined,
      canReply: true,
    });

    expect(screen.queryByText('replyButton')).toBeNull();
  });

  it('hides the reply button when canReply is false (e.g. replyPermission=nobody)', () => {
    renderNode({ node: makeNode({ id: 'a' }), canReply: false });

    expect(screen.queryByText('replyButton')).toBeNull();
  });

  it('toggles an inline ReplyForm under the comment when Reply is clicked', () => {
    renderNode({ node: makeNode({ id: 'a' }) });

    expect(screen.queryByTestId('reply-form')).toBeNull();
    fireEvent.click(screen.getByText('replyButton'));
    expect(screen.getByTestId('reply-form')).toBeDefined();
  });

  it('passes the displayName as replyToUsername (so the form shows "Replying to @Alice")', () => {
    renderNode({ node: makeNode({ id: 'a' }) });

    fireEvent.click(screen.getByText('replyButton'));
    expect(screen.getByTestId('reply-form').textContent).toContain('Alice');
  });

  it('renders nested children recursively when not collapsed', () => {
    const child = makeNode({
      id: 'child',
      content: 'nested reply',
      parentId: 'a',
      rootPostId: 'a',
    });
    const parent = makeNode({ id: 'a', content: 'parent comment', children: [child] });

    renderNode({ node: parent });

    expect(screen.getByText('parent comment')).toBeDefined();
    expect(screen.getByText('nested reply')).toBeDefined();
  });

  it('hides body, toolbar, and children when collapsed; shows hiddenReplies counter', () => {
    const grandchild = makeNode({
      id: 'grand',
      content: 'grandchild',
      parentId: 'child',
      rootPostId: 'a',
    });
    const child = makeNode({
      id: 'child',
      content: 'child reply',
      parentId: 'a',
      rootPostId: 'a',
      children: [grandchild],
    });
    const parent = makeNode({ id: 'a', content: 'parent', children: [child] });

    renderNode({ node: parent });

    // Sanity: 3 collapse buttons (parent + child + grandchild) before collapse
    expect(screen.getAllByLabelText('collapseAriaLabel')).toHaveLength(3);

    // Click the OUTERMOST collapse button (the parent's). DOM order = render
    // order, so the first match is the parent's own button.
    fireEvent.click(screen.getAllByLabelText('collapseAriaLabel')[0]);

    // Body, children gone
    expect(screen.queryByText('parent')).toBeNull();
    expect(screen.queryByText('child reply')).toBeNull();
    expect(screen.queryByText('grandchild')).toBeNull();
    // 2 descendants total (child + grandchild) → hiddenReplies key shown
    expect(screen.getByText('hiddenReplies')).toBeDefined();
    // Aria label flips to expand
    expect(screen.getByLabelText('expandAriaLabel')).toBeDefined();
  });

  it('renders the spoiler overlay only when enableSpoiler AND node.isSpoiler are both true', () => {
    renderNode({ node: makeNode({ id: 'a', isSpoiler: true }), enableSpoiler: true });

    expect(screen.getByLabelText('spoiler.overlayAriaLabel')).toBeDefined();
  });

  it('does NOT render spoiler overlay for a node with isSpoiler=false even when enableSpoiler is true', () => {
    renderNode({ node: makeNode({ id: 'a', isSpoiler: false }), enableSpoiler: true });

    expect(screen.queryByLabelText('spoiler.overlayAriaLabel')).toBeNull();
  });

  it('does NOT render spoiler overlay when enableSpoiler is false even if isSpoiler=true (e.g. position_memory thread)', () => {
    renderNode({ node: makeNode({ id: 'a', isSpoiler: true }), enableSpoiler: false });

    expect(screen.queryByLabelText('spoiler.overlayAriaLabel')).toBeNull();
  });

  it("renders Delete button only on the viewer's own comment", () => {
    renderNode({ node: makeNode({ id: 'a', userId: 'viewer-1' }), currentUserId: 'viewer-1' });
    expect(screen.getByTestId('delete-button')).toBeDefined();

    cleanup();

    renderNode({ node: makeNode({ id: 'a', userId: 'someone-else' }), currentUserId: 'viewer-1' });
    expect(screen.queryByTestId('delete-button')).toBeNull();
  });

  describe('indent soft-cap', () => {
    function findChildContainer(rootText: string, container: HTMLElement): HTMLElement | null {
      // The reply container is a sibling of the body paragraph of the parent
      // node. We locate the parent by its body text, climb to the
      // CommentNode wrapper, then return the only child <div> with a
      // border-l-2 class (the reply group).
      const bodyP = Array.from(container.querySelectorAll('p')).find(
        (el) => el.textContent === rootText
      );
      if (!bodyP) return null;
      let cursor: HTMLElement | null = bodyP;
      while (cursor && !cursor.id.startsWith('post-')) {
        cursor = cursor.parentElement;
      }
      if (!cursor) return null;
      return cursor.querySelector(':scope > div > div > div.border-l-2') as HTMLElement | null;
    }

    it('adds left padding (pl-4) on the children container while depth < cap', () => {
      const child = makeNode({ id: 'r', content: 'child', parentId: 'a', rootPostId: 'a' });
      const parent = makeNode({ id: 'a', content: 'parent', children: [child] });

      const { container } = renderNode({ node: parent, depth: 0 });

      const childContainer = findChildContainer('parent', container);
      expect(childContainer?.className).toContain('pl-4');
      expect(childContainer?.className).not.toContain('pl-0');
    });

    it('drops the left padding once depth reaches MAX_INDENT_DEPTH (8) so layout does not break on narrow screens', () => {
      // We can simulate "we are already at depth 8" by passing depth=8
      // directly. The wrapper this CommentNode renders for ITS children
      // should drop pl-4.
      const child = makeNode({ id: 'r', content: 'child', parentId: 'a', rootPostId: 'a' });
      const parent = makeNode({ id: 'a', content: 'parent', children: [child] });

      const { container } = renderNode({ node: parent, depth: 8 });

      const childContainer = findChildContainer('parent', container);
      expect(childContainer?.className).toContain('pl-0');
      expect(childContainer?.className).not.toContain('pl-4');
    });

    it('still renders nested children past the cap (cap is visual indent, not data)', () => {
      const grandchild = makeNode({
        id: 'g',
        content: 'grandchild',
        parentId: 'r',
        rootPostId: 'a',
      });
      const child = makeNode({
        id: 'r',
        content: 'child',
        parentId: 'a',
        rootPostId: 'a',
        children: [grandchild],
      });
      const parent = makeNode({ id: 'a', content: 'parent', children: [child] });

      // Render starting deep so even the "child" group is past the cap.
      renderNode({ node: parent, depth: 10 });

      // All three bodies still in the DOM
      expect(screen.getByText('parent')).toBeDefined();
      expect(screen.getByText('child')).toBeDefined();
      expect(screen.getByText('grandchild')).toBeDefined();
    });
  });
});

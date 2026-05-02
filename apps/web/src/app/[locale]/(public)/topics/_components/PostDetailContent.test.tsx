import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { LikeMeta, TopicPostWithAuthor } from '../_lib/shared';
import { PostDetailContent } from './PostDetailContent';

afterEach(() => {
  cleanup();
});

// The chunk detail page only shows the per-post delete button on the detail
// view (γ-mirror — listing cards are wrapped in <Link>). The visibility rule
// is: render the button iff `user && user.id === post.userId`. These tests
// pin that rule down structurally so a future refactor of PostDetailContent
// does not silently expose the delete button to non-authors.

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : '#'}>{children}</a>
  ),
}));

// Stub heavy descendants so we can render PostDetailContent in jsdom without
// pulling in AdSense, LinkedText markdown, or the ReplySection client tree.
vi.mock('@/app/[locale]/_components', () => ({
  LinkedText: ({ text }: { text: string }) => <span>{text}</span>,
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/app/[locale]/_components/AdSense/AdSenseGuard', () => ({
  AdSenseGuard: () => null,
}));

vi.mock('./HashScrollTarget', () => ({
  HashScrollTarget: () => null,
}));

vi.mock('./LikeButton', () => ({
  LikeButton: () => <div data-testid="like-button" />,
}));

vi.mock('./ReplySection', () => ({
  ReplySection: () => <div data-testid="reply-section" />,
}));

vi.mock('@/app/[locale]/_components/UserAvatar', () => ({
  UserAvatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./DeletePostButton', () => ({
  DeletePostButton: ({ postId }: { postId: string }) => (
    <button data-testid="delete-post-button" data-post-id={postId}>
      delete
    </button>
  ),
}));

vi.mock('@/config', () => ({
  ADSENSE_SLOT_CONTENT_BOTTOM: '',
  ADSENSE_SLOT_CONTENT_MIDDLE: '',
  IS_LOCAL_DEV: false,
}));

const POST_AUTHOR_ID = 'user-author';
const OTHER_USER_ID = 'user-other';

function makePost(overrides: Partial<TopicPostWithAuthor> = {}): TopicPostWithAuthor {
  return {
    id: 'post-1',
    userId: POST_AUTHOR_ID,
    topicType: 'chunk',
    topicKey: 'rook-battery',
    parentId: null,
    rootPostId: null,
    replyPermission: 'everyone',
    content: 'a chunk comment',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    author: {
      username: 'tester',
      displayName: 'Tester',
      avatarUrl: null,
      flair: null,
      country: null,
    },
    ...overrides,
  } as TopicPostWithAuthor;
}

const likeMeta: LikeMeta = { likeCount: 0, likedByMe: false };
const i18n = {
  likeNamespace: 'topics.chunks',
  deleteNamespace: 'topics.chunks.deletePost',
  replyNamespace: 'topics.chunks.replies',
  repliesTitle: 'Replies',
  repliesCount: '(0)',
  noReplies: 'No replies',
  loginToReply: 'Sign in to reply',
};

const baseProps = {
  locale: 'en' as Locale,
  topicKey: 'rook-battery',
  likeMeta,
  replies: [],
  canReply: true,
  replyRestrictionMessage: null,
  toggleLikeAction: vi.fn(),
  deletePostAction: vi.fn(),
  createReplyAction: vi.fn(),
  redirectPath: '/en/chunks/rook-battery',
  i18n,
};

describe('PostDetailContent — delete button visibility', () => {
  it('renders the delete button when the signed-in user is the post author', () => {
    render(
      <PostDetailContent
        {...baseProps}
        post={makePost()}
        user={{ id: POST_AUTHOR_ID } as Parameters<typeof PostDetailContent>[0]['user']}
      />
    );

    const button = screen.queryByTestId('delete-post-button');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('data-post-id')).toBe('post-1');
  });

  it('does NOT render the delete button when the user is signed out (user=null)', () => {
    render(<PostDetailContent {...baseProps} post={makePost()} user={null} />);
    expect(screen.queryByTestId('delete-post-button')).toBeNull();
  });

  it('does NOT render the delete button when the signed-in user is not the post author', () => {
    render(
      <PostDetailContent
        {...baseProps}
        post={makePost()}
        user={{ id: OTHER_USER_ID } as Parameters<typeof PostDetailContent>[0]['user']}
      />
    );
    expect(screen.queryByTestId('delete-post-button')).toBeNull();
  });
});

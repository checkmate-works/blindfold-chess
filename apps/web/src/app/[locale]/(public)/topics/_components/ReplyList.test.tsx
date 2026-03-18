import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PostWithReplyMeta } from '../_lib/queries';
import { ReplyList } from './ReplyList';

afterEach(() => {
  cleanup();
});

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/[locale]/(public)/topics/_components/LikeButton', () => ({
  LikeButton: () => <div data-testid="like-button" />,
}));

vi.mock('@/app/[locale]/(public)/topics/_components/UserAvatar', () => ({
  UserAvatar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-avatar">{children}</div>
  ),
}));

vi.mock('@/app/[locale]/_components/LinkedText', () => ({
  LinkedText: ({ text }: { text: string }) => <>{text}</>,
}));

const mockToggleLike = vi.fn();

function makeReply(overrides: Partial<PostWithReplyMeta> = {}): PostWithReplyMeta {
  return {
    id: 'reply-1',
    userId: 'user-1',
    topicType: 'square',
    topicKey: 'e4',
    parentId: 'post-1',
    content: 'short reply',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    author: {
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: null,
      flair: null,
      country: null,
    },
    replyMeta: {
      replyCount: 0,
      latestReplyAt: null,
      repliers: [],
      uniqueReplierCount: 0,
    },
    likeMeta: {
      likeCount: 0,
      likedByMe: false,
    },
    ...overrides,
  } as PostWithReplyMeta;
}

describe('ReplyList', () => {
  it('should display short content without show more button', () => {
    const reply = makeReply({ content: 'Hello world' });
    render(
      <ReplyList
        replies={[reply]}
        locale="en"
        topicKey="e4"
        toggleLikeAction={mockToggleLike}
        likeI18nNamespace="topics.squares"
      />
    );

    expect(screen.getByText('Hello world')).toBeDefined();
    expect(screen.queryByText('showMore')).toBeNull();
  });

  it('should truncate long content and show "show more" button', () => {
    const longContent = 'a'.repeat(300);
    const reply = makeReply({ content: longContent });
    render(
      <ReplyList
        replies={[reply]}
        locale="en"
        topicKey="e4"
        toggleLikeAction={mockToggleLike}
        likeI18nNamespace="topics.squares"
      />
    );

    // Should show truncated content (200 chars + ...)
    expect(screen.getByText('a'.repeat(200) + '...')).toBeDefined();
    // Should show the "show more" button
    expect(screen.getByText('showMore')).toBeDefined();
  });

  it('should expand content when "show more" is clicked', () => {
    const longContent = 'a'.repeat(300);
    const reply = makeReply({ content: longContent });
    render(
      <ReplyList
        replies={[reply]}
        locale="en"
        topicKey="e4"
        toggleLikeAction={mockToggleLike}
        likeI18nNamespace="topics.squares"
      />
    );

    // Click "show more"
    fireEvent.click(screen.getByText('showMore'));

    // Should now show full content
    expect(screen.getByText(longContent)).toBeDefined();
    // "show more" button should disappear
    expect(screen.queryByText('showMore')).toBeNull();
  });

  it('should not show "show more" for content exactly 200 characters', () => {
    const content = 'b'.repeat(200);
    const reply = makeReply({ content });
    render(
      <ReplyList
        replies={[reply]}
        locale="en"
        topicKey="e4"
        toggleLikeAction={mockToggleLike}
        likeI18nNamespace="topics.squares"
      />
    );

    expect(screen.getByText(content)).toBeDefined();
    expect(screen.queryByText('showMore')).toBeNull();
  });

  it('should render multiple replies', () => {
    const replies = [
      makeReply({ id: 'reply-1', content: 'First reply' }),
      makeReply({ id: 'reply-2', content: 'Second reply' }),
    ];
    render(
      <ReplyList
        replies={replies}
        locale="en"
        topicKey="e4"
        toggleLikeAction={mockToggleLike}
        likeI18nNamespace="topics.squares"
      />
    );

    expect(screen.getByText('First reply')).toBeDefined();
    expect(screen.getByText('Second reply')).toBeDefined();
  });
});

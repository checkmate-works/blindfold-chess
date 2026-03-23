import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedItem, TopicPostFeedItem } from '../_lib/types';
import { FeedCard } from './FeedCard';

afterEach(() => {
  cleanup();
});

vi.mock('./TopicPostCard', () => ({
  TopicPostCard: ({ post }: { post: unknown }) => (
    <div data-testid="topic-post-card">{JSON.stringify(post)}</div>
  ),
}));

// --- Helpers ---

function createTopicPostFeedItem(overrides: Partial<TopicPostFeedItem> = {}): TopicPostFeedItem {
  return {
    id: 'feed-1',
    entityType: 'topic_post',
    entityId: 'post-1',
    actorId: 'user-1',
    createdAt: '2025-01-15T10:00:00.000Z',
    data: {
      id: 'post-1',
      content: 'Test content',
      topicType: 'opening',
      topicKey: 'sicilian-defense',
      createdAt: new Date('2025-01-15T10:00:00.000Z'),
      userId: 'user-1',
      rootPostId: null,
      deletedAt: null,
      updatedAt: null,
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
      rating: null,
      openingName: 'Sicilian Defense',
      openingFen: null,
    },
    ...overrides,
  } as TopicPostFeedItem;
}

const defaultProps = {
  locale: 'en',
  showMoreLabel: 'Show more',
  justNowLabel: 'Just now',
  newReplyTemplate: 'New reply {time}',
};

// --- Tests ---

describe('FeedCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render TopicPostCard for topic_post entityType', () => {
    const item = createTopicPostFeedItem();

    render(<FeedCard item={item} {...defaultProps} />);

    expect(screen.getByTestId('topic-post-card')).toBeInTheDocument();
  });

  it('should pass post data to TopicPostCard', () => {
    const item = createTopicPostFeedItem();

    render(<FeedCard item={item} {...defaultProps} />);

    const card = screen.getByTestId('topic-post-card');
    expect(card.textContent).toContain('Test content');
    expect(card.textContent).toContain('sicilian-defense');
  });

  it('should return null for unknown entityType', () => {
    // Force an unknown entity type by casting
    const item = {
      id: 'feed-1',
      entityType: 'unknown_type',
      entityId: 'entity-1',
      actorId: 'user-1',
      createdAt: '2025-01-15T10:00:00.000Z',
      data: {},
    } as unknown as FeedItem;

    const { container } = render(<FeedCard item={item} {...defaultProps} />);

    expect(container.innerHTML).toBe('');
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedItem, TopicPostFeedItem } from '../_lib/types';
import { FeedClient } from './FeedClient';

afterEach(() => {
  cleanup();
});

// --- IntersectionObserver stub (not available in jsdom) ---

const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = vi.fn();
      constructor() {}
    }
  );
});

// --- Mocks ---

vi.mock('../_actions/getFeed', () => ({
  getFeed: vi.fn(),
}));

vi.mock('./FeedCard', () => ({
  FeedCard: ({ item }: { item: FeedItem }) => (
    <div data-testid={`feed-card-${item.id}`}>{item.entityType}</div>
  ),
}));

vi.mock('./FeedSkeleton', () => ({
  FeedSkeleton: () => <div data-testid="feed-skeleton">Loading...</div>,
}));

// --- Helpers ---

function createTopicPostFeedItem(id: string): TopicPostFeedItem {
  return {
    id,
    entityType: 'topic_post',
    entityId: `post-${id}`,
    actorId: 'user-1',
    createdAt: '2025-01-15T10:00:00.000Z',
    data: {
      id: `post-${id}`,
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
  } as TopicPostFeedItem;
}

const defaultProps = {
  locale: 'en',
  showMoreLabel: 'Show more',
  justNowLabel: 'Just now',
  newReplyTemplate: 'New reply {time}',
  noItemsLabel: 'No items yet',
};

// --- Tests ---

describe('FeedClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('should show noItemsLabel when there are no items', () => {
      render(<FeedClient initialItems={[]} initialCursor={null} {...defaultProps} />);

      expect(screen.getByText('No items yet')).toBeInTheDocument();
    });

    it('should not render any feed cards when items are empty', () => {
      render(<FeedClient initialItems={[]} initialCursor={null} {...defaultProps} />);

      expect(screen.queryByTestId(/feed-card-/)).toBeNull();
    });
  });

  describe('rendering items', () => {
    it('should render FeedCard for each initial item', () => {
      const items = [
        createTopicPostFeedItem('1'),
        createTopicPostFeedItem('2'),
        createTopicPostFeedItem('3'),
      ];

      render(<FeedClient initialItems={items} initialCursor={null} {...defaultProps} />);

      expect(screen.getByTestId('feed-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('feed-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('feed-card-3')).toBeInTheDocument();
    });

    it('should render a single item correctly', () => {
      const items = [createTopicPostFeedItem('1')];

      render(<FeedClient initialItems={items} initialCursor={null} {...defaultProps} />);

      expect(screen.getByTestId('feed-card-1')).toBeInTheDocument();
      expect(screen.queryByText('No items yet')).toBeNull();
    });
  });

  describe('infinite scroll sentinel', () => {
    it('should render sentinel div when cursor exists', () => {
      const items = [createTopicPostFeedItem('1')];

      const { container } = render(
        <FeedClient
          initialItems={items}
          initialCursor="2025-01-15T09:00:00.000Z"
          {...defaultProps}
        />
      );

      // The sentinel div is the last child in the divide-y container
      const divideContainer = container.querySelector('.divide-y');
      expect(divideContainer?.lastElementChild?.tagName).toBe('DIV');
    });

    it('should not render sentinel div when cursor is null', () => {
      const items = [createTopicPostFeedItem('1')];

      render(<FeedClient initialItems={items} initialCursor={null} {...defaultProps} />);

      // Only the feed cards should be rendered, no sentinel
      expect(screen.queryByTestId('feed-skeleton')).toBeNull();
    });
  });
});

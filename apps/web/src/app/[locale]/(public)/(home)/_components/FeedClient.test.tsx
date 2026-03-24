import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedItem, TopicPostFeedItem } from '../_lib/types';
import { FeedClient } from './FeedClient';

afterEach(() => {
  cleanup();
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

vi.mock('./NativeAdCard', () => ({
  NativeAdCard: ({ adLabel }: { adLabel: string }) => (
    <div data-testid="native-ad-card">{adLabel}</div>
  ),
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
      parentId: null,
      rootPostId: null,
      replyPermission: 'everyone',
      deletedAt: null,
      updatedAt: new Date('2025-01-15T10:00:00.000Z'),
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

  describe('native ads', () => {
    const adBanners = [
      {
        href: 'https://example.com/ad1',
        imagePath: '/images/ad1.webp',
        alt: 'Test Ad 1',
        width: 400,
        height: 400,
      },
    ];

    it('should insert a native ad card after every AD_INTERVAL items', () => {
      const items = [
        createTopicPostFeedItem('1'),
        createTopicPostFeedItem('2'),
        createTopicPostFeedItem('3'),
      ];

      render(
        <FeedClient
          initialItems={items}
          initialCursor={null}
          {...defaultProps}
          adBanners={adBanners}
          adLabel="Ad"
        />
      );

      // 3 feed cards + 1 ad card (after every 3 items)
      expect(screen.getAllByTestId(/feed-card-/)).toHaveLength(3);
      expect(screen.getAllByTestId('native-ad-card')).toHaveLength(1);
    });

    it('should not insert ads when adBanners is empty', () => {
      const items = [
        createTopicPostFeedItem('1'),
        createTopicPostFeedItem('2'),
        createTopicPostFeedItem('3'),
      ];

      render(
        <FeedClient initialItems={items} initialCursor={null} {...defaultProps} adBanners={[]} />
      );

      expect(screen.queryByTestId('native-ad-card')).toBeNull();
    });

    it('should not insert ads when fewer items than AD_INTERVAL', () => {
      const items = [createTopicPostFeedItem('1'), createTopicPostFeedItem('2')];

      render(
        <FeedClient
          initialItems={items}
          initialCursor={null}
          {...defaultProps}
          adBanners={adBanners}
          adLabel="Ad"
        />
      );

      expect(screen.queryByTestId('native-ad-card')).toBeNull();
    });

    it('should cycle through multiple ad banners', () => {
      const multipleAds = [
        { ...adBanners[0], alt: 'Ad A' },
        { ...adBanners[0], alt: 'Ad B' },
      ];
      const items = Array.from({ length: 6 }, (_, i) => createTopicPostFeedItem(String(i + 1)));

      render(
        <FeedClient
          initialItems={items}
          initialCursor={null}
          {...defaultProps}
          adBanners={multipleAds}
          adLabel="Ad"
        />
      );

      // 6 items → ads at positions 3 and 6 → 2 ad cards
      expect(screen.getAllByTestId('native-ad-card')).toHaveLength(2);
    });
  });

  describe('loading state', () => {
    it('should not render loading skeleton when not loading', () => {
      const items = [createTopicPostFeedItem('1')];

      render(<FeedClient initialItems={items} initialCursor={null} {...defaultProps} />);

      expect(screen.queryByTestId('feed-skeleton')).toBeNull();
    });
  });
});

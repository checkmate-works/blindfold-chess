import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ChallengeRankUpdateFeedItem,
  FeedItem,
  PositionFeedItem,
  TopicPostFeedItem,
} from '../_lib/types';
import { FeedCard } from './FeedCard';

afterEach(() => {
  cleanup();
});

vi.mock('./TopicPostCard', () => ({
  TopicPostCard: ({ post }: { post: unknown }) => (
    <div data-testid="topic-post-card">{JSON.stringify(post)}</div>
  ),
}));

vi.mock('./ChallengeRankUpdateCard', () => ({
  ChallengeRankUpdateCard: ({ data }: { data: unknown }) => (
    <div data-testid="challenge-rank-update-card">{JSON.stringify(data)}</div>
  ),
}));

vi.mock('./PositionFeedCard', () => ({
  PositionFeedCard: ({ data }: { data: unknown }) => (
    <div data-testid="position-feed-card">{JSON.stringify(data)}</div>
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

  it('should render ChallengeRankUpdateCard for challenge_rank_update entityType', () => {
    const item: ChallengeRankUpdateFeedItem = {
      id: 'feed-2',
      entityType: 'challenge_rank_update',
      entityId: 'result-1',
      actorId: 'user-1',
      createdAt: '2025-01-15T10:00:00.000Z',
      data: {
        menuType: 'coordinate_quiz',
        leaderboardKey: 'white',
        score: 25,
        incorrectAnswers: 3,
        timeTaken: 45,
        rank: 5,
        isNewEntry: true,
        actor: {
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
          country: null,
          flair: null,
        },
      },
    };

    render(<FeedCard item={item} {...defaultProps} />);

    expect(screen.getByTestId('challenge-rank-update-card')).toBeInTheDocument();
  });

  it('should render PositionFeedCard for position entityType', () => {
    const item: PositionFeedItem = {
      id: 'feed-3',
      entityType: 'position',
      entityId: 'position-1',
      actorId: 'user-1',
      createdAt: '2025-01-15T10:00:00.000Z',
      data: {
        id: 'position-1',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        createdAt: '2025-01-15T10:00:00.000Z',
        author: {
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
          country: null,
          flair: null,
        },
        likeMeta: {
          likeCount: 0,
          likedByMe: false,
        },
      },
    };

    render(<FeedCard item={item} {...defaultProps} />);

    expect(screen.getByTestId('position-feed-card')).toBeInTheDocument();
  });

  it('should pass position data to PositionFeedCard', () => {
    const item: PositionFeedItem = {
      id: 'feed-3',
      entityType: 'position',
      entityId: 'position-1',
      actorId: 'user-1',
      createdAt: '2025-01-15T10:00:00.000Z',
      data: {
        id: 'position-1',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        createdAt: '2025-01-15T10:00:00.000Z',
        author: {
          username: 'testuser',
          displayName: 'Test User',
          avatarUrl: null,
          country: null,
          flair: null,
        },
        likeMeta: {
          likeCount: 3,
          likedByMe: true,
        },
      },
    };

    render(<FeedCard item={item} {...defaultProps} />);

    const card = screen.getByTestId('position-feed-card');
    expect(card.textContent).toContain('position-1');
    expect(card.textContent).toContain('rnbqkbnr');
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

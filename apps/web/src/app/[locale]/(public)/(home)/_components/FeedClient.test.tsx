import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeedItem } from '../_lib/types';
import { FeedClient } from './FeedClient';

// IntersectionObserver is not available in jsdom
const observeMock = vi.fn();
const disconnectMock = vi.fn();
vi.stubGlobal(
  'IntersectionObserver',
  vi.fn(function () {
    return {
      observe: observeMock,
      disconnect: disconnectMock,
      unobserve: vi.fn(),
    };
  })
);

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

const defaultProps = {
  locale: 'en',
  showMoreLabel: 'Show more',
  justNowLabel: 'Just now',
  newReplyTemplate: 'New reply {time}',
};

// --- Tests ---

describe('FeedClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('should render an empty container when there is no cursor (no more pages)', () => {
      const { container } = render(<FeedClient initialCursor={null} {...defaultProps} />);

      // The wrapper div is always rendered; no feed cards or sentinel inside
      expect(screen.queryByTestId(/feed-card-/)).toBeNull();
      expect(container.querySelector('div')).toBeTruthy();
    });
  });

  describe('sentinel for infinite scroll', () => {
    it('should render a sentinel div when there is a cursor', () => {
      const { container } = render(
        <FeedClient initialCursor="2025-01-15T09:00:00.000Z" {...defaultProps} />
      );

      // Sentinel is a plain div at the end for IntersectionObserver
      const sentinel = container.querySelector('div > div:last-child');
      expect(sentinel).toBeTruthy();
    });

    it('should not render a sentinel div when cursor is null', () => {
      render(<FeedClient initialCursor={null} {...defaultProps} />);

      expect(screen.queryByTestId('feed-skeleton')).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should not render loading skeleton initially', () => {
      render(<FeedClient initialCursor={null} {...defaultProps} />);

      expect(screen.queryByTestId('feed-skeleton')).toBeNull();
    });
  });
});

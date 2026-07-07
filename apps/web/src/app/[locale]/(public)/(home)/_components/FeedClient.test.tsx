import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getFeed } from '../_actions/getFeed';
import type { FeedItem } from '../_lib/types';
import { FeedClient } from './FeedClient';

// IntersectionObserver is not available in jsdom.
// Capture the callback so individual tests can simulate the sentinel entering
// the viewport and drive the infinite-scroll `loadMore` path end-to-end.
const observeMock = vi.fn();
const disconnectMock = vi.fn();
let lastIntersectionCallback: IntersectionObserverCallback | null = null;
vi.stubGlobal(
  'IntersectionObserver',
  vi.fn(function (cb: IntersectionObserverCallback) {
    lastIntersectionCallback = cb;
    return {
      observe: observeMock,
      disconnect: disconnectMock,
      unobserve: vi.fn(),
    };
  })
);

function triggerIntersection() {
  if (!lastIntersectionCallback) {
    throw new Error('IntersectionObserver callback was never registered');
  }
  const entry = { isIntersecting: true } as IntersectionObserverEntry;
  // Cast: we only use the fields FeedClient reads.
  lastIntersectionCallback([entry], {} as IntersectionObserver);
}

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

// NativeAdCard pulls in i18n/board-preference context we don't need here.
// We care about wrapper structure, not ad content, so a trivial stub suffices.
vi.mock('./NativeAdCard', () => ({
  NativeAdCard: () => <div data-testid="ad-slot">ad</div>,
}));

// ResponsiveAdSlot (the AdSense fallback) uses a matchMedia-backed hook jsdom
// doesn't implement; stub it since these tests exercise wrapper structure.
vi.mock('./ResponsiveAdSlot', () => ({
  ResponsiveAdSlot: () => <div data-testid="ad-slot-fallback">adsense</div>,
}));

// --- Helpers ---

const defaultProps = {
  initialItems: [] as FeedItem[],
  locale: 'en',
  showMoreLabel: 'Show more',
  justNowLabel: 'Just now',
  showAds: true,
  // At least one creative must be present for ad slots to be inserted.
  nativeAdCreatives: [
    {
      id: 'creative-1',
      href: 'https://example.com',
      avatarImagePath: null,
      avatarAlt: 'Ad',
      title: 'Ad title',
      description: 'Ad description',
    },
  ],
};

function makeTopicPostItem(id: string): FeedItem {
  return {
    id,
    entityType: 'topic_post',
    entityId: id,
    actorId: 'user-1',
    createdAt: '2025-01-15T10:00:00.000Z',
    data: {} as never,
  } as FeedItem;
}

// --- Tests ---

describe('FeedClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastIntersectionCallback = null;
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

  describe('initial SSR items', () => {
    it('should render items passed via initialItems', () => {
      const initialItems = [makeTopicPostItem('item-1'), makeTopicPostItem('item-2')];
      render(<FeedClient {...defaultProps} initialItems={initialItems} initialCursor={null} />);

      expect(screen.getByTestId('feed-card-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('feed-card-item-2')).toBeInTheDocument();
    });
  });

  describe('visually-last item border', () => {
    it('strips border-bottom only from the true last item (not the last SSR item when more follow)', () => {
      // With showAds=true and AD_INTERVAL=10, 3 initial items produce no ad;
      // the visually-last item is simply the last feed card.
      const initialItems = [makeTopicPostItem('a'), makeTopicPostItem('b'), makeTopicPostItem('c')];
      const { container } = render(
        <FeedClient
          {...defaultProps}
          initialItems={initialItems}
          initialCursor="2025-01-15T09:00:00.000Z"
        />
      );

      // Collect all item wrapper divs (those that carry the per-item border class).
      const wrappers = Array.from(
        container.querySelectorAll<HTMLElement>('div.border-b.border-border')
      );
      expect(wrappers.length).toBe(3);

      // Only the final wrapper should have `last:border-b-0` effectively applied;
      // that class is written on every wrapper but only matches the last child.
      // Assert the DOM order puts all three wrappers inside a single container
      // (prevents the old SSR/Client dual-wrapper regression).
      const parents = new Set(wrappers.map((el) => el.parentElement));
      expect(parents.size).toBe(1);
    });

    it('applies :last-child (last:border-b-0) to the final wrapper when no more pages follow', () => {
      // When cursor is null, no sentinel is appended; the last feed wrapper
      // must itself be the last child of its parent for `last:border-b-0` to
      // resolve. This is the exact condition the user complained about:
      // the divider between the last visually-rendered item and the
      // DashboardCard's own bottom border was doubling / missing.
      const initialItems = [makeTopicPostItem('x'), makeTopicPostItem('y'), makeTopicPostItem('z')];
      const { container } = render(
        <FeedClient {...defaultProps} initialItems={initialItems} initialCursor={null} />
      );

      const wrappers = Array.from(
        container.querySelectorAll<HTMLElement>('div.border-b.border-border')
      );
      expect(wrappers.length).toBe(3);

      const lastWrapper = wrappers[wrappers.length - 1];
      // `last:border-b-0` only takes effect when the element truly is
      // `:last-child`. Any trailing sibling (skeleton, sentinel, stray node)
      // would silently defeat the rule.
      expect(lastWrapper.matches(':last-child')).toBe(true);
      // Every wrapper carries the variant class so CSS can do its job.
      expect(lastWrapper.className).toContain('last:border-b-0');
    });
  });

  describe('infinite scroll border invariant', () => {
    it('after loadMore, the newly-appended item becomes the visually-last wrapper', async () => {
      const initialItems = [makeTopicPostItem('init-1'), makeTopicPostItem('init-2')];
      const nextPageItems = [makeTopicPostItem('next-1'), makeTopicPostItem('next-2')];

      vi.mocked(getFeed).mockResolvedValueOnce({
        items: nextPageItems,
        nextCursor: null,
      });

      const { container } = render(
        <FeedClient
          {...defaultProps}
          initialItems={initialItems}
          initialCursor="2025-01-15T09:00:00.000Z"
        />
      );

      // Before loading more, init-2 is the last feed-card wrapper, but because
      // the sentinel <div> is still a following sibling, the last wrapper is
      // NOT :last-child (by design — there is more to load).
      const wrappersBefore = Array.from(
        container.querySelectorAll<HTMLElement>('div.border-b.border-border')
      );
      expect(wrappersBefore.length).toBe(2);

      await act(async () => {
        triggerIntersection();
      });

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-next-2')).toBeInTheDocument();
      });

      // After loadMore resolves with nextCursor=null, the sentinel disappears
      // so the final wrapper is once again :last-child — thus `last:border-b-0`
      // applies to the new true-last item (next-2), not the former last (init-2).
      const wrappersAfter = Array.from(
        container.querySelectorAll<HTMLElement>('div.border-b.border-border')
      );
      expect(wrappersAfter.length).toBe(4);

      const allShareOneParent = new Set(wrappersAfter.map((el) => el.parentElement)).size;
      expect(allShareOneParent).toBe(1);

      const lastWrapper = wrappersAfter[wrappersAfter.length - 1];
      expect(lastWrapper.matches(':last-child')).toBe(true);
      expect(lastWrapper.querySelector('[data-testid="feed-card-next-2"]')).toBeTruthy();

      // Previously-last item (init-2) must no longer be :last-child — otherwise
      // the divider between init-2 and next-1 would be missing (the original bug).
      const prevLast = wrappersBefore[wrappersBefore.length - 1];
      expect(prevLast.matches(':last-child')).toBe(false);
    });
  });

  describe('ad-slot last-item edge case', () => {
    it('when initialItems.length % AD_INTERVAL === 0 and showAds is true, the ad wrapper is the visually-last block and shares the same per-item wrapper pattern', () => {
      // AD_INTERVAL is 10. Render exactly 10 items with showAds=true -> an ad
      // slot is appended as the 11th display element. With initialCursor=null
      // (no sentinel), the ad wrapper is the last DOM child of the container.
      const initialItems = Array.from({ length: 10 }, (_, i) => makeTopicPostItem(`ad-edge-${i}`));
      const { container } = render(
        <FeedClient {...defaultProps} initialItems={initialItems} initialCursor={null} />
      );

      const wrappers = Array.from(
        container.querySelectorAll<HTMLElement>('div.border-b.border-border')
      );
      // 10 feed wrappers + 1 ad wrapper.
      expect(wrappers.length).toBe(11);

      const lastWrapper = wrappers[wrappers.length - 1];
      // The ad wrapper is the visually-last block, must be :last-child so
      // `last:border-b-0` kicks in and the double border with DashboardCard
      // is avoided.
      expect(lastWrapper.matches(':last-child')).toBe(true);
      expect(lastWrapper.className).toContain('last:border-b-0');
      // Confirm this is the ad block, not a feed card wrapper.
      expect(lastWrapper.querySelector('[data-testid="feed-card-ad-edge-9"]')).toBeNull();
    });
  });

  describe('empty feed', () => {
    it('renders no border/divider and no crash when initialItems is empty and no cursor', () => {
      const { container } = render(
        <FeedClient {...defaultProps} initialItems={[]} initialCursor={null} />
      );

      const wrappers = container.querySelectorAll('div.border-b.border-border');
      expect(wrappers.length).toBe(0);
      expect(screen.queryByTestId(/feed-card-/)).toBeNull();
      expect(screen.queryByTestId('feed-skeleton')).toBeNull();
    });
  });

  describe('boundary: exactly one item', () => {
    it('renders a single wrapper that is both first and last, with last:border-b-0 applicable', () => {
      const { container } = render(
        <FeedClient
          {...defaultProps}
          initialItems={[makeTopicPostItem('solo')]}
          initialCursor={null}
        />
      );

      const wrappers = Array.from(
        container.querySelectorAll<HTMLElement>('div.border-b.border-border')
      );
      expect(wrappers.length).toBe(1);

      const only = wrappers[0];
      expect(only.matches(':first-child')).toBe(true);
      expect(only.matches(':last-child')).toBe(true);
      expect(only.className).toContain('last:border-b-0');
      expect(only.querySelector('[data-testid="feed-card-solo"]')).toBeTruthy();
    });
  });
});

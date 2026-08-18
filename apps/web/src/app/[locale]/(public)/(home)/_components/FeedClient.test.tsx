import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
vi.mock('@/app/[locale]/_components/NativeAdCard', () => ({
  // Mirror the real component's wrapper contract: it owns `ad-slot-wrapper`
  // and merges the caller's `className` (the feed's row divider) into it.
  NativeAdCard: ({ className }: { className?: string }) => (
    <div className={`ad-slot-wrapper${className ? ` ${className}` : ''}`} data-testid="ad-slot">
      ad
    </div>
  ),
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
  loadMoreLabel: 'Load more',
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
      thumbnail: { fen: 'startpos' },
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
      // With showAds=true, 3 initial items produce the leading ad slot plus
      // 3 feed cards; the visually-last item is the last feed card.
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
      // 1 leading ad wrapper + 3 feed wrappers.
      expect(wrappers.length).toBe(4);

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
      // 1 leading ad wrapper + 3 feed wrappers.
      expect(wrappers.length).toBe(4);

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
      // 1 leading ad wrapper + 2 feed wrappers.
      expect(wrappersBefore.length).toBe(3);

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
      // 1 leading ad wrapper + 4 feed wrappers.
      expect(wrappersAfter.length).toBe(5);

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

  describe('initialItems seeds state once', () => {
    it('ignores a new initialItems value on re-render, and picks it up when remounted via key', () => {
      // The list is `useState`-owned after mount (infinite scroll appends to
      // it), so a caller that swaps the feed in place gets the OLD one. This
      // is why the profile timeline keys its Suspense boundary by filter:
      // without the remount, clicking a filter chip fetched the new items
      // server-side and then discarded them, leaving the previous filter's
      // cards on screen while the chips showed the new selection.
      const { rerender } = render(
        <FeedClient
          {...defaultProps}
          key="filter-a"
          initialItems={[makeTopicPostItem('from-filter-a')]}
          initialCursor={null}
        />
      );
      expect(screen.getByTestId('feed-card-from-filter-a')).toBeInTheDocument();

      rerender(
        <FeedClient
          {...defaultProps}
          key="filter-a"
          initialItems={[makeTopicPostItem('from-filter-b')]}
          initialCursor={null}
        />
      );
      expect(screen.queryByTestId('feed-card-from-filter-b')).toBeNull();
      expect(screen.getByTestId('feed-card-from-filter-a')).toBeInTheDocument();

      rerender(
        <FeedClient
          {...defaultProps}
          key="filter-b"
          initialItems={[makeTopicPostItem('from-filter-b')]}
          initialCursor={null}
        />
      );
      expect(screen.getByTestId('feed-card-from-filter-b')).toBeInTheDocument();
      expect(screen.queryByTestId('feed-card-from-filter-a')).toBeNull();
    });
  });

  describe('fetchPage override', () => {
    it('paginates through fetchPage instead of getFeed when supplied', async () => {
      const nextPageItems = [makeTopicPostItem('profile-1')];
      const fetchPage = vi.fn().mockResolvedValue({ items: nextPageItems, nextCursor: null });

      render(
        <FeedClient
          {...defaultProps}
          initialItems={[makeTopicPostItem('init-1')]}
          initialCursor="2025-01-15T09:00:00.000Z"
          fetchPage={fetchPage}
        />
      );

      await act(async () => {
        triggerIntersection();
      });

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-profile-1')).toBeInTheDocument();
      });

      expect(fetchPage).toHaveBeenCalledWith('2025-01-15T09:00:00.000Z');
      // The scope-based path must stay untouched for surfaces that override it,
      // otherwise a profile timeline would silently splice home-feed items
      // (other members' activity) into one member's page.
      expect(getFeed).not.toHaveBeenCalled();
    });

    it('falls back to the scope-based getFeed when fetchPage is omitted', async () => {
      vi.mocked(getFeed).mockResolvedValueOnce({ items: [], nextCursor: null });

      render(
        <FeedClient
          {...defaultProps}
          initialItems={[makeTopicPostItem('init-1')]}
          initialCursor="2025-01-15T09:00:00.000Z"
          scope="topics"
        />
      );

      await act(async () => {
        triggerIntersection();
      });

      await waitFor(() => {
        expect(getFeed).toHaveBeenCalledWith('2025-01-15T09:00:00.000Z', undefined, 'topics');
      });
    });
  });

  describe('leading ad slot', () => {
    it('renders the ad wrapper as the first block, sharing the per-item wrapper pattern, and never as the last block of an AD_INTERVAL-sized page', () => {
      // AD_INTERVAL is 10. Render exactly 10 items with showAds=true -> the
      // only ad slot leads the list (before item 1); the slot that precedes
      // item 11 does not exist until item 11 loads, so with initialCursor=null
      // the last DOM child is a feed card, not an ad.
      const initialItems = Array.from({ length: 10 }, (_, i) => makeTopicPostItem(`ad-edge-${i}`));
      const { container } = render(
        <FeedClient {...defaultProps} initialItems={initialItems} initialCursor={null} />
      );

      const wrappers = Array.from(
        container.querySelectorAll<HTMLElement>('div.border-b.border-border')
      );
      // 1 ad wrapper + 10 feed wrappers.
      expect(wrappers.length).toBe(11);

      const firstWrapper = wrappers[0];
      expect(firstWrapper.matches(':first-child')).toBe(true);
      // The mocked NativeAdCard owns its wrapper (as the real one does), so the
      // wrapper element itself is the ad slot.
      expect(firstWrapper.dataset.testid).toBe('ad-slot');
      // The ad row shares the divider so it reads as one more feed row.
      expect(firstWrapper.className).toContain('border-b');

      const lastWrapper = wrappers[wrappers.length - 1];
      expect(lastWrapper.matches(':last-child')).toBe(true);
      expect(lastWrapper.querySelector('[data-testid="feed-card-ad-edge-9"]')).not.toBeNull();
      expect(lastWrapper.dataset.testid).not.toBe('ad-slot');
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

  describe('ad fallback when ad_creatives has no eligible rows', () => {
    it('renders the AdSense fallback, wrapped in .ad-slot-wrapper, instead of a native ad card', () => {
      // Any non-empty page carries the leading ad slot. With
      // nativeAdCreatives empty (mirrors an empty ad_creatives table), the
      // slot must fall back to ResponsiveAdSlot rather than being skipped.
      const initialItems = Array.from({ length: 10 }, (_, i) => makeTopicPostItem(`noad-${i}`));
      render(
        <FeedClient
          {...defaultProps}
          nativeAdCreatives={[]}
          initialItems={initialItems}
          initialCursor={null}
        />
      );

      expect(screen.queryByTestId('ad-slot')).toBeNull();
      const fallback = screen.getByTestId('ad-slot-fallback');
      expect(fallback).toBeInTheDocument();

      // The `bfc_ads_hidden` no-flash CSS rule hides `.ad-slot-wrapper`; if
      // the fallback ever rendered outside that wrapper, ad-free viewers
      // (subscribers / ad_free grant holders) would still see the AdSense
      // unit.
      const wrapper = fallback.parentElement;
      expect(wrapper?.className).toContain('ad-slot-wrapper');
    });
  });

  describe('boundary: exactly one item', () => {
    it('renders a single wrapper that is both first and last, with last:border-b-0 applicable', () => {
      // Ads off, otherwise the leading ad slot would be the first wrapper.
      const { container } = render(
        <FeedClient
          {...defaultProps}
          showAds={false}
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

  describe('pages that render nothing', () => {
    // A feed page can come back with zero items and a live cursor: `feed_items`
    // rows outlive the entity they point at, and the loader drops them after
    // they have counted against the page limit. Nothing is appended, so the
    // sentinel stays in view and the observer re-fires — an unbounded request
    // loop that never renders anything.
    const emptyPage = { items: [] as FeedItem[], nextCursor: '2025-01-15T08:00:00.000Z' };

    /**
     * The sentinel is the bare `<div>` the observer watches — the only
     * attribute-less, empty child of the feed root (item wrappers and ad slots
     * all carry a className). Its presence is what proves auto-loading is on
     * or off, and the check has to scan every child rather than just the
     * trailing one: the manual button renders after the sentinel, so a version
     * that wrongly kept both would still show the button last.
     *
     * Asserting on the DOM rather than on call counts is deliberate.
     * `triggerIntersection()` invokes a captured callback directly, so it
     * keeps firing after the real observer has been disconnected and can never
     * demonstrate that the loop stopped.
     */
    function feedSentinel(container: HTMLElement): Element | null {
      const root = container.firstElementChild;
      if (!root) return null;
      return (
        Array.from(root.children).find(
          (el) => el.tagName === 'DIV' && el.attributes.length === 0 && !el.firstChild
        ) ?? null
      );
    }

    it('keeps auto-loading after a single empty page', async () => {
      vi.mocked(getFeed).mockResolvedValue(emptyPage);

      const { container } = render(
        <FeedClient {...defaultProps} initialCursor="2025-01-15T09:00:00.000Z" />
      );

      await act(async () => {
        triggerIntersection();
      });

      // One empty page is a hiccup the next page usually clears — the sentinel
      // must survive it, and no button should appear yet.
      await waitFor(() => {
        expect(vi.mocked(getFeed)).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
      expect(feedSentinel(container)).toBeTruthy();
    });

    it('stops auto-loading and offers a button once two empty pages arrive in a row', async () => {
      vi.mocked(getFeed).mockResolvedValue(emptyPage);

      const { container } = render(
        <FeedClient {...defaultProps} initialCursor="2025-01-15T09:00:00.000Z" />
      );

      await act(async () => {
        triggerIntersection();
      });
      await act(async () => {
        triggerIntersection();
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
      });

      // The whole point: with the sentinel unmounted there is nothing left for
      // a real IntersectionObserver to fire on, so the loop cannot continue
      // without the reader asking it to.
      expect(feedSentinel(container)).toBeNull();
    });

    it('resumes auto-loading when a manual page finally renders something', async () => {
      vi.mocked(getFeed)
        .mockResolvedValueOnce(emptyPage)
        .mockResolvedValueOnce(emptyPage)
        .mockResolvedValueOnce({
          items: [makeTopicPostItem('live-1')],
          nextCursor: '2025-01-15T07:00:00.000Z',
        });

      const { container } = render(
        <FeedClient {...defaultProps} initialCursor="2025-01-15T09:00:00.000Z" />
      );

      await act(async () => {
        triggerIntersection();
      });
      await act(async () => {
        triggerIntersection();
      });

      const button = await screen.findByRole('button', { name: 'Load more' });
      await act(async () => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('feed-card-live-1')).toBeInTheDocument();
      });
      // Back to a live run: the button is gone and the sentinel is back, so
      // scrolling picks up where it left off.
      expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
      expect(feedSentinel(container)).toBeTruthy();
    });
  });
});

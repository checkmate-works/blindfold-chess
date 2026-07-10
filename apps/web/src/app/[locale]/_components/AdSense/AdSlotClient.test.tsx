import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdSlotResolution } from '@/lib/ads/ad-slot-resolution';

import { AdSlotClient } from './AdSlotClient';

/**
 * Tests for <AdSlotClient> — the client half of the fixed banner ad slots
 * (`content-middle` / `content-bottom`).
 *
 * The scenario this suite exists to pin down: when the `ad_creatives` table
 * has no eligible row for a slot, `/api/ad-slot/[slot]` returns
 * `{ creative: null }` and the component must fall back to `AdSenseDisplay`
 * — the pre-`ad_creatives` behavior — without ever dropping the
 * `.ad-slot-wrapper` class the `bfc_ads_hidden` no-flash CSS rule
 * (`[locale]/layout.tsx`) depends on to hide the slot for ad-free viewers.
 */

vi.mock('@/config', () => ({
  ADSENSE_SLOT_CONTENT_MIDDLE: 'mid-slot-123',
  ADSENSE_SLOT_CONTENT_BOTTOM: undefined,
  IS_LOCAL_DEV: false,
}));

vi.mock('./AdSenseDisplay', () => ({
  AdSenseDisplay: ({ slotId }: { slotId: string }) => (
    <div data-testid="adsense-fallback">{slotId}</div>
  ),
}));

vi.mock('./BannerCreative', () => ({
  BannerCreative: ({ href }: { href: string }) => <div data-testid="banner-creative">{href}</div>,
}));

function mockFetchOnce(resolution: AdSlotResolution) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(resolution),
    })
  );
}

function getWrapper() {
  const el = screen.queryByTestId('adsense-fallback') ?? screen.queryByTestId('banner-creative');
  return el?.closest('.ad-slot-wrapper') ?? null;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.adsHidden;
});

describe('AdSlotClient', () => {
  beforeEach(() => {
    delete document.documentElement.dataset.adsHidden;
  });

  it('renders the .ad-slot-wrapper container immediately, before the fetch resolves', () => {
    mockFetchOnce({ creative: null });

    const { container } = render(<AdSlotClient slot="content-middle" />);

    const wrapper = container.querySelector('[data-ad-slot="content-middle"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain('ad-slot-wrapper');
    expect(screen.queryByTestId('adsense-fallback')).toBeNull();
    expect(screen.queryByTestId('banner-creative')).toBeNull();
  });

  it('renders the admin creative when ad_creatives has an eligible row for this slot', async () => {
    mockFetchOnce({
      creative: { href: 'https://example.com/promo', payload: { imagePath: '/x.png' } as never },
    });

    render(<AdSlotClient slot="content-middle" />);

    await waitFor(() => {
      expect(screen.getByTestId('banner-creative')).toHaveTextContent('https://example.com/promo');
    });

    expect(getWrapper()).not.toBeNull();
    expect(screen.queryByTestId('adsense-fallback')).toBeNull();
  });

  it('falls back to AdSenseDisplay — still inside .ad-slot-wrapper — when ad_creatives has no eligible row (creative: null)', async () => {
    mockFetchOnce({ creative: null });

    render(<AdSlotClient slot="content-middle" />);

    await waitFor(() => {
      expect(screen.getByTestId('adsense-fallback')).toBeInTheDocument();
    });

    // The entitlement-hiding CSS rule targets `.ad-slot-wrapper`; if the
    // fallback ever rendered outside it, ad-free viewers would still see the
    // AdSense unit.
    expect(getWrapper()).not.toBeNull();
    expect(screen.queryByTestId('banner-creative')).toBeNull();
  });

  it('falls back to AdSenseDisplay when the fetch itself fails (network error / non-OK response)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<AdSlotClient slot="content-middle" />);

    await waitFor(() => {
      expect(screen.getByTestId('adsense-fallback')).toBeInTheDocument();
    });
    expect(getWrapper()).not.toBeNull();
  });

  it('renders nothing (beyond the wrapper) when falling back on a slot with no AdSense slot ID configured', async () => {
    mockFetchOnce({ creative: null });

    const { container } = render(<AdSlotClient slot="content-bottom" />);

    await waitFor(() => {
      // Loading state resolves to `fallback`, but ADSENSE_SLOT_CONTENT_BOTTOM
      // is undefined in this mock, so neither AdSense nor the placeholder
      // should render.
      expect(container.querySelector('[data-ad-slot="content-bottom"]')?.children.length).toBe(0);
    });

    expect(screen.queryByTestId('adsense-fallback')).toBeNull();
  });

  it('skips the network round-trip entirely when the viewer already holds the ad-hiding entitlement', async () => {
    document.documentElement.dataset.adsHidden = 'true';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(<AdSlotClient slot="content-middle" />);

    // Give any stray microtask a chance to run before asserting the negative.
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('adsense-fallback')).toBeNull();
    expect(screen.queryByTestId('banner-creative')).toBeNull();
  });
});

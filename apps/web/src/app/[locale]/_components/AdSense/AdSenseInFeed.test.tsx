import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';
import type { StorageAvailability } from '@/lib/storage/storage-availability';

import { AdSenseInFeed } from './AdSenseInFeed';

/**
 * Tests for <AdSenseInFeed> — mirror of the AdSenseDisplay suite. Same
 * gating contract, different ad format ("fluid" in-feed).
 */

vi.mock('@/config', () => ({
  IS_LOCAL_DEV: false,
  ADSENSE_PUBLISHER_ID: 'ca-pub-7777777777',
}));

vi.mock('@/lib/storage/StorageAvailabilityProvider', () => ({
  useStorageAvailabilityContext: vi.fn(),
}));

const mockedUseContext = vi.mocked(useStorageAvailabilityContext);

const allAvailable: StorageAvailability = {
  localStorage: true,
  indexedDB: true,
  cookies: true,
  all: true,
};

const blocked: StorageAvailability = {
  localStorage: true,
  indexedDB: true,
  cookies: false,
  all: false,
};

describe('AdSenseInFeed', () => {
  const originalAdsbygoogle = (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;

  beforeEach(() => {
    mockedUseContext.mockReset();
    (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = [];
    delete document.documentElement.dataset.adsHidden;
  });

  afterEach(() => {
    cleanup();
    (window as unknown as { adsbygoogle?: unknown }).adsbygoogle = originalAdsbygoogle;
    delete document.documentElement.dataset.adsHidden;
  });

  function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  it('renders nothing when availability context is null', () => {
    mockedUseContext.mockReturnValue(null);

    const { container } = render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when cookies are blocked (all=false)', () => {
    mockedUseContext.mockReturnValue(blocked);

    const { container } = render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('does NOT push to adsbygoogle when the gate is closed', () => {
    mockedUseContext.mockReturnValue(blocked);

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('renders the fluid in-feed <ins> markup when the gate is open', () => {
    mockedUseContext.mockReturnValue(allAvailable);

    const { container } = render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);

    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
    expect(ins?.getAttribute('data-ad-client')).toBe('ca-pub-7777777777');
    expect(ins?.getAttribute('data-ad-slot')).toBe('5555');
    expect(ins?.getAttribute('data-ad-format')).toBe('fluid');
    expect(ins?.getAttribute('data-ad-layout-key')).toBe('-abc-def-ghi-jkl');
  });

  it('pushes to adsbygoogle exactly once when the gate is open', () => {
    mockedUseContext.mockReturnValue(allAvailable);

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    const { rerender } = render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);
    expect(pushSpy).toHaveBeenCalledTimes(1);
    rerender(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("skips push when data-ads-hidden='true' at mount", () => {
    mockedUseContext.mockReturnValue(allAvailable);
    document.documentElement.dataset.adsHidden = 'true';

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("skips push after visibilitychange->visible when data-ads-hidden is 'true'", () => {
    mockedUseContext.mockReturnValue(allAvailable);
    document.documentElement.dataset.adsHidden = 'true';

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);
    expect(pushSpy).not.toHaveBeenCalled();

    setVisibility('hidden');
    setVisibility('visible');

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('pushes on visibilitychange->visible if ads-hidden was later cleared', () => {
    mockedUseContext.mockReturnValue(allAvailable);
    document.documentElement.dataset.adsHidden = 'true';

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseInFeed slotId="5555" layoutKey="-abc-def-ghi-jkl" />);
    expect(pushSpy).not.toHaveBeenCalled();

    delete document.documentElement.dataset.adsHidden;
    setVisibility('hidden');
    setVisibility('visible');

    expect(pushSpy).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    setVisibility('visible');
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });
});

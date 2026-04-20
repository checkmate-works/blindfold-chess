import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';
import type { StorageAvailability } from '@/lib/storage/storage-availability';

import { AdSenseDisplay } from './AdSenseDisplay';

/**
 * Tests for <AdSenseDisplay>.
 *
 * AdSenseDisplay must gate on the storage-availability context the same way
 * the <GoogleScripts> loader does. If the probe hasn't finished (`null`) or
 * any storage mechanism is blocked (`all: false`) we must:
 *   - Not emit the wrapper <div> (it reserves layout space).
 *   - Not emit the <ins.adsbygoogle> tag (adblockers scrub/empty it).
 *   - Not call `window.adsbygoogle.push({})` (pointless without the loader).
 *
 * We force production-ish config by mocking `@/config` so that IS_LOCAL_DEV
 * is false and ADSENSE_PUBLISHER_ID is a stable value; otherwise the
 * component falls back to <AdPlaceholder>, which is a separate code path.
 */

vi.mock('@/config', () => ({
  IS_LOCAL_DEV: false,
  ADSENSE_PUBLISHER_ID: 'ca-pub-9999999999',
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
  localStorage: false,
  indexedDB: true,
  cookies: true,
  all: false,
};

describe('AdSenseDisplay', () => {
  const originalAdsbygoogle = (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;

  beforeEach(() => {
    mockedUseContext.mockReset();
    // Fresh adsbygoogle queue for every test so we can count pushes
    // deterministically.
    (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = [];
    // Reset the ads-hidden marker between tests so state doesn't leak.
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

    const { container } = render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);

    expect(container).toBeEmptyDOMElement();
    expect(container.querySelector('ins.adsbygoogle')).toBeNull();
    expect(container.querySelector('div')).toBeNull();
  });

  it('renders nothing when any storage probe is blocked', () => {
    mockedUseContext.mockReturnValue(blocked);

    const { container } = render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('does NOT push to adsbygoogle when the gate is closed', () => {
    mockedUseContext.mockReturnValue(blocked);

    // Give us a spy-able `push` so we can watch for calls.
    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('renders the <ins.adsbygoogle> wrapper when the gate is open', () => {
    mockedUseContext.mockReturnValue(allAvailable);

    const { container } = render(
      <AdSenseDisplay slotId="1234567890" slot="content-middle" className="my-8" />
    );

    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).not.toBeNull();
    expect(ins?.getAttribute('data-ad-client')).toBe('ca-pub-9999999999');
    expect(ins?.getAttribute('data-ad-slot')).toBe('1234567890');
    expect(ins?.getAttribute('data-ad-format')).toBe('auto');
    expect(ins?.getAttribute('data-full-width-responsive')).toBe('true');

    const wrapper = ins?.parentElement;
    expect(wrapper?.className).toContain('my-8');
  });

  it('pushes to adsbygoogle exactly once when the gate is open', () => {
    mockedUseContext.mockReturnValue(allAvailable);

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    const { rerender } = render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith({});

    // Re-rendering must NOT duplicate pushes — `pushed` ref guards against it.
    rerender(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('swallows exceptions from adsbygoogle.push — ads are non-critical', () => {
    mockedUseContext.mockReturnValue(allAvailable);

    (window as unknown as { adsbygoogle: { push: () => void } }).adsbygoogle = {
      push: () => {
        throw new Error('adblocker stub rejected push');
      },
    };

    expect(() => {
      render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);
    }).not.toThrow();
  });

  it('pushes when data-ads-hidden attribute is absent', () => {
    mockedUseContext.mockReturnValue(allAvailable);
    // Sanity: attribute should not be set.
    expect(document.documentElement.dataset.adsHidden).toBeUndefined();

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);

    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("skips push when data-ads-hidden='true' at mount", () => {
    mockedUseContext.mockReturnValue(allAvailable);
    document.documentElement.dataset.adsHidden = 'true';

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("skips push when data-ads-hidden flips to 'true' while tab is hidden and then becomes visible", () => {
    // Scenario: user completes checkout in another tab; entitlement cookie
    // is written and the other tab's bootstrap sets
    // `<html data-ads-hidden="true">`. When this tab returns to visible,
    // the not-yet-fired push should be skipped.
    mockedUseContext.mockReturnValue(allAvailable);
    document.documentElement.dataset.adsHidden = 'true';

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    // Initial mount: attribute already 'true' so nothing pushed.
    render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);
    expect(pushSpy).not.toHaveBeenCalled();

    // Tab hidden, then visible again — attribute is still 'true', so still no push.
    setVisibility('hidden');
    setVisibility('visible');

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("pushes on visibilitychange->visible if the attribute was 'true' at mount but flipped back to absent (symmetric sanity check)", () => {
    // Covers the inverse direction so the listener isn't a dead branch:
    // mount with ads-hidden set prevents push, but if the entitlement is
    // later removed (attribute cleared) and the tab becomes visible again,
    // the push should fire exactly once.
    mockedUseContext.mockReturnValue(allAvailable);
    document.documentElement.dataset.adsHidden = 'true';

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);
    expect(pushSpy).not.toHaveBeenCalled();

    delete document.documentElement.dataset.adsHidden;
    setVisibility('hidden');
    setVisibility('visible');

    expect(pushSpy).toHaveBeenCalledTimes(1);

    // Further visibility cycles must not re-push.
    setVisibility('hidden');
    setVisibility('visible');
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the visibilitychange listener on unmount', () => {
    mockedUseContext.mockReturnValue(allAvailable);
    document.documentElement.dataset.adsHidden = 'true';

    const pushSpy = vi.fn();
    (window as unknown as { adsbygoogle: { push: typeof pushSpy } }).adsbygoogle = {
      push: pushSpy,
    };

    const { unmount } = render(<AdSenseDisplay slotId="1234567890" slot="content-middle" />);
    unmount();

    // Clear the attribute and fire visibilitychange after unmount — the
    // detached effect must not leak and call push().
    delete document.documentElement.dataset.adsHidden;
    setVisibility('hidden');
    setVisibility('visible');

    expect(pushSpy).not.toHaveBeenCalled();
  });
});

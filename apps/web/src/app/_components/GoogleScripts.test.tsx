import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';
import type { StorageAvailability } from '@/lib/storage/storage-availability';

import { GoogleScripts } from './GoogleScripts';

/**
 * Tests for the <GoogleScripts> gating component.
 *
 * The contract:
 *   - When the availability context is `null` (probe not finished yet or no
 *     Provider present) -> emit NOTHING. No AdSense loader, no GA, no CMP,
 *     no placeholders.
 *   - When `availability.all === false` -> emit NOTHING. This is the whole
 *     reason this module exists: in a browser where storage is blocked,
 *     injecting Google scripts only floods Sentry with
 *     `NS_ERROR_NOT_INITIALIZED` and other noise.
 *   - When `availability.all === true` -> emit exactly the two Google
 *     scripts (AdSense loader, GA), each only if its respective ID prop is
 *     provided. There is no separate CMP script: AdSense's own Privacy &
 *     messaging consent message is delivered through the AdSense loader
 *     itself once enabled in the AdSense dashboard.
 *
 * We mock:
 *   - `next/script` to a plain tag we can assert against.
 *   - `@next/third-parties/google`'s `GoogleAnalytics` because the real
 *     helper requires internal Next.js runtime state we do not have here.
 *   - `useStorageAvailabilityContext` so each test can pin the availability
 *     value without going through the Provider.
 */

vi.mock('next/script', () => ({
  default: (props: Record<string, unknown>) => {
    // Render a plain div with data attributes that mirror the props so tests
    // can assert on them via DOM queries. We emit the tag even when `src` is
    // missing so that the gating assertions (presence/absence) remain robust.
    return (
      <div
        data-testid="next-script"
        data-id={props.id as string | undefined}
        data-src={props.src as string | undefined}
        data-strategy={props.strategy as string | undefined}
        data-cross-origin={(props.crossOrigin as string | undefined) ?? undefined}
      />
    );
  },
}));

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: (props: { gaId: string }) => (
    <div data-testid="google-analytics" data-ga-id={props.gaId} />
  ),
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

const partiallyBlocked: StorageAvailability = {
  localStorage: true,
  indexedDB: false,
  cookies: true,
  all: false,
};

const fullyBlocked: StorageAvailability = {
  localStorage: false,
  indexedDB: false,
  cookies: false,
  all: false,
};

describe('GoogleScripts', () => {
  beforeEach(() => {
    mockedUseContext.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  describe('gate: context=null (probe not finished or no Provider)', () => {
    it('renders NOTHING when the context returns null', () => {
      mockedUseContext.mockReturnValue(null);

      const { container } = render(
        <GoogleScripts adsensePublisherId="ca-pub-1234567890" gaMeasurementId="G-TEST123" />
      );

      expect(container).toBeEmptyDOMElement();
      expect(container.querySelectorAll('[data-testid="next-script"]').length).toBe(0);
      expect(container.querySelectorAll('[data-testid="google-analytics"]').length).toBe(0);
    });
  });

  describe('gate: availability.all === false', () => {
    it('renders NOTHING when fully blocked', () => {
      mockedUseContext.mockReturnValue(fullyBlocked);

      const { container } = render(
        <GoogleScripts adsensePublisherId="ca-pub-1234567890" gaMeasurementId="G-TEST123" />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('renders NOTHING when only a single probe is blocked (e.g. indexedDB off)', () => {
      mockedUseContext.mockReturnValue(partiallyBlocked);

      const { container } = render(
        <GoogleScripts adsensePublisherId="ca-pub-1234567890" gaMeasurementId="G-TEST123" />
      );

      // Even one blocked probe must close the gate. The product decision is
      // all-or-nothing: if anything Google might touch is blocked, do not
      // inject any of the scripts.
      expect(container).toBeEmptyDOMElement();
    });

    it('regression guard: NO <ins> placeholder, NO <script src="adsbygoogle...">, NO sentry-trigger surface', () => {
      // This is the Sentry-regression observability assertion: if GoogleScripts
      // emits nothing, then the runtime has literally zero entry points for
      // the NS_ERROR_NOT_INITIALIZED Google bundle to execute, which is the
      // cleanest possible fix.
      mockedUseContext.mockReturnValue(fullyBlocked);

      const { container } = render(
        <GoogleScripts adsensePublisherId="ca-pub-1234567890" gaMeasurementId="G-TEST123" />
      );

      expect(container.querySelector('ins.adsbygoogle')).toBeNull();
      expect(container.querySelector('[data-src*="adsbygoogle.js"]')).toBeNull();
      expect(container.querySelector('[data-testid="google-analytics"]')).toBeNull();
    });
  });

  describe('gate open: availability.all === true', () => {
    it('renders the AdSense loader with lazyOnload strategy and the right id', () => {
      mockedUseContext.mockReturnValue(allAvailable);

      const { container } = render(<GoogleScripts adsensePublisherId="ca-pub-1234567890" />);

      const adsLoader = container.querySelector('[data-id="adsbygoogle-loader"]');
      expect(adsLoader).not.toBeNull();
      expect(adsLoader?.getAttribute('data-strategy')).toBe('lazyOnload');
      expect(adsLoader?.getAttribute('data-src')).toContain('adsbygoogle.js');
      expect(adsLoader?.getAttribute('data-src')).toContain('client=ca-pub-1234567890');
      expect(adsLoader?.getAttribute('data-cross-origin')).toBe('anonymous');
    });

    it('renders GoogleAnalytics with the provided measurement id', () => {
      mockedUseContext.mockReturnValue(allAvailable);

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST456" />);

      const ga = container.querySelector('[data-testid="google-analytics"]');
      expect(ga).not.toBeNull();
      expect(ga?.getAttribute('data-ga-id')).toBe('G-TEST456');
    });

    it('skips any Google script whose ID prop is undefined', () => {
      mockedUseContext.mockReturnValue(allAvailable);

      const { container } = render(<GoogleScripts />);

      // No props => nothing rendered even when gate is open.
      expect(container.querySelector('[data-id="adsbygoogle-loader"]')).toBeNull();
      expect(container.querySelector('[data-testid="google-analytics"]')).toBeNull();
    });

    it('renders both scripts together when every ID is provided', () => {
      mockedUseContext.mockReturnValue(allAvailable);

      const { container } = render(
        <GoogleScripts adsensePublisherId="ca-pub-1234567890" gaMeasurementId="G-TEST123" />
      );

      expect(container.querySelector('[data-id="adsbygoogle-loader"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="google-analytics"]')).not.toBeNull();
    });
  });
});

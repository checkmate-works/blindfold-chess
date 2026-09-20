import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_ATTRIBUTE } from '@/lib/consent/consent-cookie';
import { CONSENT_CHANGED_EVENT } from '@/lib/consent/consent-events';
import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';
import type { StorageAvailability } from '@/lib/storage/storage-availability';

import { GoogleScripts } from './GoogleScripts';

/**
 * Tests for the <GoogleScripts> gating component.
 *
 * The contract, in one sentence: Google Analytics loads when, and only when,
 * the visitor has granted consent AND every storage mechanism is writable.
 *
 *   - Availability context `null` (probe not finished, or no Provider) ->
 *     nothing. `availability.all === false` -> nothing, which is the reason
 *     this module exists: in a browser where storage is blocked, injecting
 *     Google scripts only floods Sentry with `NS_ERROR_NOT_INITIALIZED`.
 *   - No consent decision, or `denied` -> nothing, no matter what the storage
 *     probe says. Nothing is fetched from Google before the visitor agrees.
 *   - Granting consent mounts GA in place, without a reload: the decision
 *     lands on `<html data-consent>` and is announced on the window.
 *
 * We mock `@next/third-parties/google`'s `GoogleAnalytics` because the real
 * helper requires internal Next.js runtime state we do not have here, and
 * `useStorageAvailabilityContext` so each test can pin availability without
 * going through the Provider. Consent is NOT mocked — it is read off the real
 * document element, which is what the component does in production.
 */

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

function setConsent(value: 'granted' | 'denied' | null) {
  if (value === null) document.documentElement.removeAttribute(CONSENT_ATTRIBUTE);
  else document.documentElement.setAttribute(CONSENT_ATTRIBUTE, value);
}

describe('GoogleScripts', () => {
  beforeEach(() => {
    mockedUseContext.mockReset();
    setConsent(null);
  });

  describe('storage gate', () => {
    it('renders NOTHING when the context returns null, even with consent granted', () => {
      mockedUseContext.mockReturnValue(null);
      setConsent('granted');

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST123" />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders NOTHING when fully blocked', () => {
      mockedUseContext.mockReturnValue(fullyBlocked);
      setConsent('granted');

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST123" />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders NOTHING when only a single probe is blocked (e.g. indexedDB off)', () => {
      // Even one blocked probe must close the gate. The product decision is
      // all-or-nothing: if anything Google might touch is blocked, do not
      // inject the script.
      mockedUseContext.mockReturnValue(partiallyBlocked);
      setConsent('granted');

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST123" />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('consent gate', () => {
    it('renders NOTHING before the visitor has answered', () => {
      mockedUseContext.mockReturnValue(allAvailable);

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST123" />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders NOTHING when the visitor declined', () => {
      mockedUseContext.mockReturnValue(allAvailable);
      setConsent('denied');

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST123" />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders GoogleAnalytics with the provided measurement id once consent is granted', () => {
      mockedUseContext.mockReturnValue(allAvailable);
      setConsent('granted');

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST456" />);

      const ga = container.querySelector('[data-testid="google-analytics"]');
      expect(ga).not.toBeNull();
      expect(ga?.getAttribute('data-ga-id')).toBe('G-TEST456');
    });

    it('mounts GA in place when consent is granted after the first render', () => {
      // The banner sets the attribute and fires the event in the same click;
      // without this subscription the visitor would have to reload before
      // analytics started, which is the whole reason the decision is carried
      // on the document element rather than in a cookie read at render time.
      mockedUseContext.mockReturnValue(allAvailable);

      const { container } = render(<GoogleScripts gaMeasurementId="G-TEST123" />);
      expect(container).toBeEmptyDOMElement();

      act(() => {
        setConsent('granted');
        window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
      });

      expect(container.querySelector('[data-testid="google-analytics"]')).not.toBeNull();
    });
  });

  it('skips GA when no measurement id is configured, even with both gates open', () => {
    mockedUseContext.mockReturnValue(allAvailable);
    setConsent('granted');

    const { container } = render(<GoogleScripts />);

    expect(container.querySelector('[data-testid="google-analytics"]')).toBeNull();
  });
});

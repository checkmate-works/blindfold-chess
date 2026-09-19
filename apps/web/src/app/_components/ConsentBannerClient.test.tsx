import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSENT_ATTRIBUTE, CONSENT_COOKIE_NAME } from '@/lib/consent/consent-cookie';
import { CONSENT_CHANGED_EVENT } from '@/lib/consent/consent-events';
import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';
import type { StorageAvailability } from '@/lib/storage/storage-availability';

import { ConsentBannerClient } from './ConsentBannerClient';

/**
 * The banner's visibility is CSS, not React: it is in the HTML of every page
 * and the `html[data-consent] .consent-banner` rule in each root layout hides
 * it once a decision exists. jsdom applies no such stylesheet, so these tests
 * assert the thing the rule keys off — the attribute — plus the cookie write
 * and the change event, which is what actually has to be right.
 */

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

const cookiesBlocked: StorageAvailability = {
  localStorage: true,
  indexedDB: true,
  cookies: false,
  all: false,
};

function renderBanner() {
  return render(
    <ConsentBannerClient regionLabel="Cookie consent" acceptLabel="Agree" denyLabel="Decline">
      We use analytics cookies.
    </ConsentBannerClient>
  );
}

beforeEach(() => {
  mockedUseContext.mockReset();
  document.documentElement.removeAttribute(CONSENT_ATTRIBUTE);
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
});

afterEach(() => {
  document.documentElement.removeAttribute(CONSENT_ATTRIBUTE);
});

describe('ConsentBannerClient', () => {
  it('renders while the storage probe has not answered yet', () => {
    // `null` means "probe still running", which is also the value during SSR.
    // Withholding the banner here would keep it out of the server-rendered
    // HTML and flash it in on every first visit.
    mockedUseContext.mockReturnValue(null);

    const { container } = renderBanner();

    expect(container.querySelector('.consent-banner')).not.toBeNull();
  });

  it('renders when every storage mechanism is available', () => {
    mockedUseContext.mockReturnValue(allAvailable);

    const { getByRole } = renderBanner();

    expect(getByRole('region', { name: 'Cookie consent' })).toBeTruthy();
  });

  it('renders nothing once the probe reports blocked storage', () => {
    // A decision that cannot be persisted is not worth asking for: the banner
    // would come back on the next page load no matter which button was pressed.
    mockedUseContext.mockReturnValue(cookiesBlocked);

    const { container } = renderBanner();

    expect(container).toBeEmptyDOMElement();
  });

  it('records consent on the cookie, the attribute and a change event', () => {
    mockedUseContext.mockReturnValue(allAvailable);
    const onChange = vi.fn();
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);

    const { getByText } = renderBanner();
    fireEvent.click(getByText('Agree'));

    expect(document.documentElement.getAttribute(CONSENT_ATTRIBUTE)).toBe('granted');
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=1:granted`);
    expect(onChange).toHaveBeenCalledTimes(1);

    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  });

  it('records a refusal the same way, so the banner stops asking', () => {
    mockedUseContext.mockReturnValue(allAvailable);

    const { getByText } = renderBanner();
    fireEvent.click(getByText('Decline'));

    expect(document.documentElement.getAttribute(CONSENT_ATTRIBUTE)).toBe('denied');
    expect(document.cookie).toContain(`${CONSENT_COOKIE_NAME}=1:denied`);
  });
});

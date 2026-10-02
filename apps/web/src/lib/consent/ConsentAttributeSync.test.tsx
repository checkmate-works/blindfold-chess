import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsentAttributeSync } from './ConsentAttributeSync';
import { syncConsentAttribute } from './consent-client';
import { CONSENT_ATTRIBUTE, CONSENT_COOKIE_NAME, consentCookieValue } from './consent-cookie';
import { CONSENT_CHANGED_EVENT } from './consent-events';

/**
 * React 19 strips every attribute off `<html>` when it mounts that singleton
 * on the client without hydrating it (a `[locale]` change, a root-level
 * hydration failure). The `<head>` bootstrap only runs at document parse, so
 * these tests stand in for "the bootstrap already ran, then React wiped the
 * element": set the cookie, clear the attribute, and check that mounting the
 * sync puts it back — and that it stays quiet when there is nothing to do.
 */

const html = () => document.documentElement;

function setCookie(value: string | null) {
  document.cookie =
    value === null
      ? `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`
      : `${CONSENT_COOKIE_NAME}=${value}; path=/`;
}

let changed: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  changed = vi.fn<() => void>();
  window.addEventListener(CONSENT_CHANGED_EVENT, changed);
});

afterEach(() => {
  window.removeEventListener(CONSENT_CHANGED_EVENT, changed);
  setCookie(null);
  html().removeAttribute(CONSENT_ATTRIBUTE);
});

describe('syncConsentAttribute', () => {
  it('restores the attribute from the cookie after <html> lost it', () => {
    setCookie(consentCookieValue('granted'));
    html().removeAttribute(CONSENT_ATTRIBUTE);

    syncConsentAttribute();

    expect(html().getAttribute(CONSENT_ATTRIBUTE)).toBe('granted');
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the attribute already matches the cookie', () => {
    setCookie(consentCookieValue('denied'));
    html().setAttribute(CONSENT_ATTRIBUTE, 'denied');

    syncConsentAttribute();

    expect(html().getAttribute(CONSENT_ATTRIBUTE)).toBe('denied');
    expect(changed).not.toHaveBeenCalled();
  });

  it('leaves "no answer yet" alone when there is no cookie', () => {
    setCookie(null);

    syncConsentAttribute();

    expect(html().hasAttribute(CONSENT_ATTRIBUTE)).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });

  it('removes a stale attribute when the cookie is gone', () => {
    setCookie(null);
    html().setAttribute(CONSENT_ATTRIBUTE, 'granted');

    syncConsentAttribute();

    expect(html().hasAttribute(CONSENT_ATTRIBUTE)).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});

describe('<ConsentAttributeSync />', () => {
  it('renders nothing and re-asserts the attribute on every mount', () => {
    setCookie(consentCookieValue('granted'));
    html().removeAttribute(CONSENT_ATTRIBUTE);

    const first = render(<ConsentAttributeSync />);
    expect(first.container).toBeEmptyDOMElement();
    expect(html().getAttribute(CONSENT_ATTRIBUTE)).toBe('granted');
    first.unmount();

    // The remount is what a locale change or a root re-render looks like
    // from this component's point of view: React has wiped <html> again.
    html().removeAttribute(CONSENT_ATTRIBUTE);
    render(<ConsentAttributeSync />);
    expect(html().getAttribute(CONSENT_ATTRIBUTE)).toBe('granted');
    expect(changed).toHaveBeenCalledTimes(2);
  });
});

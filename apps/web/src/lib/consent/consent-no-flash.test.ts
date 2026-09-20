import { beforeEach, describe, expect, it } from 'vitest';

import {
  CONSENT_BANNER_CLASS,
  CONSENT_BANNER_HIDE_CSS,
  CONSENT_BOOTSTRAP_SCRIPT,
} from './consent-bootstrap-script';
import { CONSENT_ATTRIBUTE, CONSENT_COOKIE_NAME, consentCookieValue } from './consent-cookie';

/**
 * The no-flash contract, end to end: cookie -> bootstrap script -> attribute
 * -> CSS rule -> the banner is not displayed.
 *
 * Each half is trivial on its own, and that is exactly why they are tested
 * together. The script writes an attribute nothing else reads, and the rule
 * matches a selector nothing else writes; a rename on either side leaves both
 * files individually sensible and the banner flashing on every page load for
 * every visitor who has already answered — a regression nobody notices
 * without reading the rendered HTML of a second visit.
 *
 * The script is run rather than imported: it ships as text injected into
 * `<head>`, so its behaviour is a property of those bytes, not of a function.
 */
function bootstrap(): void {
  new Function(CONSENT_BOOTSTRAP_SCRIPT)();
}

function renderBanner(): HTMLElement {
  document.head.innerHTML = `<style>${CONSENT_BANNER_HIDE_CSS}</style>`;
  document.body.innerHTML = `<div class="${CONSENT_BANNER_CLASS}">banner</div>`;
  return document.body.firstElementChild as HTMLElement;
}

beforeEach(() => {
  document.documentElement.removeAttribute(CONSENT_ATTRIBUTE);
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0`;
});

describe('consent no-flash bootstrap', () => {
  it('shows the banner when no decision has been stored', () => {
    const banner = renderBanner();

    bootstrap();

    expect(document.documentElement.hasAttribute(CONSENT_ATTRIBUTE)).toBe(false);
    expect(getComputedStyle(banner).display).not.toBe('none');
  });

  it.each(['granted', 'denied'] as const)('hides the banner once %s is stored', (decision) => {
    // Both decisions hide it: the banner's question is "have you answered?",
    // and only `GoogleScripts` cares which answer it was.
    document.cookie = `${CONSENT_COOKIE_NAME}=${consentCookieValue(decision)}; path=/`;
    const banner = renderBanner();

    bootstrap();

    expect(document.documentElement.getAttribute(CONSENT_ATTRIBUTE)).toBe(decision);
    expect(getComputedStyle(banner).display).toBe('none');
  });

  it('shows the banner again when the stored decision is from an older schema version', () => {
    // The re-ask path: a version bump must leave the visitor looking exactly
    // like someone who never answered.
    document.cookie = `${CONSENT_COOKIE_NAME}=0:granted; path=/`;
    const banner = renderBanner();

    bootstrap();

    expect(document.documentElement.hasAttribute(CONSENT_ATTRIBUTE)).toBe(false);
    expect(getComputedStyle(banner).display).not.toBe('none');
  });
});

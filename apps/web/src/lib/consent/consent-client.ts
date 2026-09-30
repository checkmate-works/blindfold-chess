'use client';

import {
  CONSENT_ATTRIBUTE,
  type ConsentDecision,
  consentCookieAssignment,
  consentCookieErasure,
  readConsentDecision,
} from './consent-cookie';
import { CONSENT_CHANGED_EVENT } from './consent-events';

/**
 * The decision currently in force, read off `<html data-consent>`.
 *
 * The attribute, not the cookie, is what callers ask: the `<head>` bootstrap
 * script has already parsed the cookie by the time any of this runs, and every
 * later write goes through this module and updates both. Reading the attribute
 * keeps the "is Google Analytics allowed?" question a single DOM access.
 */
export function currentConsentDecision(): ConsentDecision | null {
  if (typeof document === 'undefined') return null;
  const value = document.documentElement.getAttribute(CONSENT_ATTRIBUTE);
  return value === 'granted' || value === 'denied' ? value : null;
}

/**
 * Record the visitor's answer: persist it, reflect it on `<html>` (which both
 * hides the banner through the layout's CSS rule and opens the gate in
 * `GoogleScripts`), and tell the listeners.
 *
 * Nothing reloads. Granting consent mounts Google Analytics on the spot, which
 * is the point of routing the decision through an attribute rather than a
 * server round trip.
 */
export function recordConsent(decision: ConsentDecision): void {
  document.cookie = consentCookieAssignment(decision);
  document.documentElement.setAttribute(CONSENT_ATTRIBUTE, decision);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
}

/**
 * Re-derive `<html data-consent>` from the cookie and fix the attribute up
 * when the two disagree.
 *
 * The `<head>` bootstrap script sets the attribute exactly once, while the
 * document is parsed. React 19 treats `<html>` as a singleton it takes over
 * rather than creates, and whenever it mounts that element on the client
 * without hydrating it, React first strips every attribute the element
 * carries and only then applies its own props (`lang`, `data-scroll-behavior`
 * and the rest). Two things make it mount `<html>` that way on a page whose
 * bootstrap has long since run:
 *
 * - a navigation that only changes the `[locale]` value. Next keeps that
 *   client-side — a different value of the same dynamic segment is not a
 *   different root layout to its router — but the layout is keyed on the
 *   value, so the whole tree under it, `<html>` included, unmounts and
 *   remounts;
 * - a hydration mismatch outside every Suspense boundary, after which React
 *   throws the server DOM away and renders the root again on the client. In
 *   production this is silent: no console output, only Sentry.
 *
 * `data-consent` is not a React prop, so after either one it is gone: the
 * CSS hide rule stops matching, the banner is back, and `GoogleScripts` reads
 * "no answer" — while the cookie is exactly where it was. The cookie is what
 * this reads back. Same failure and same remedy as `data-ads-hidden`, whose
 * `syncAdsHiddenAttribute` re-asserts from its cookie for the same reason.
 *
 * Listeners are told only when the attribute actually changed, so on an
 * ordinary page load, where the bootstrap already did the work, this is one
 * cookie read and nothing else.
 */
export function syncConsentAttribute(): void {
  const stored = readConsentDecision(document.cookie);
  if (stored === currentConsentDecision()) return;
  if (stored) {
    document.documentElement.setAttribute(CONSENT_ATTRIBUTE, stored);
  } else {
    document.documentElement.removeAttribute(CONSENT_ATTRIBUTE);
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
}

/**
 * Erase the decision so the banner comes back — the footer's "Cookie settings"
 * entry point.
 *
 * Reloads when the erased decision was `granted`. Unmounting `<GoogleAnalytics>`
 * removes the `<script>` element but not the `gtag.js` global it already
 * installed, so on that path the page would keep reporting to GA while showing
 * the visitor a banner that implies otherwise. A fresh document is the only way
 * to actually take analytics back out, and it lands on the same state the
 * no-reload path produces: cookie gone, banner showing.
 */
export function revokeConsent(): void {
  const previous = readConsentDecision(document.cookie);
  document.cookie = consentCookieErasure();
  document.documentElement.removeAttribute(CONSENT_ATTRIBUTE);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
  if (previous === 'granted') window.location.reload();
}

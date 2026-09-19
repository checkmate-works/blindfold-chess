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

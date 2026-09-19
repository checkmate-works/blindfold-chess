'use client';

import { GoogleAnalytics } from '@next/third-parties/google';

import { useConsentDecision } from '@/lib/consent/useConsentDecision';
import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';

type GoogleScriptsProps = {
  /** GA4 measurement ID (`G-XXXX`). Pass `undefined` to skip injection. */
  gaMeasurementId?: string;
};

/**
 * Injects Google Analytics, and only once two gates are open: the visitor has
 * granted consent, and a client-side probe has confirmed that `localStorage`,
 * `indexedDB` and `document.cookie` are all writable.
 *
 * Why the consent gate is "do not load it" rather than Consent Mode: with GA4
 * as the only tag on the site, withholding the script is both simpler and
 * stricter than loading gtag in a default-denied state. Nothing is requested
 * from Google at all before the visitor agrees — there is no cookieless ping
 * to explain, and no consent signal to keep in sync with a second system. The
 * decision itself lives on `<html data-consent>`; see `@/lib/consent`.
 *
 * Why all-or-nothing on storage: consent only means anything if it can be
 * persisted, and analytics only means anything if the visitor can consent.
 * When any storage layer is blocked (Firefox ETP, adblockers, sandboxed
 * iframes, private mode, etc.) every link of that chain is broken, so loading
 * the script at all just produces failed network requests and
 * `NS_ERROR_NOT_INITIALIZED` Sentry noise. Per product decision, we render
 * nothing in that case — and the banner applies the same gate, so nobody is
 * asked for a decision that could not be stored.
 *
 * Why a shared context: this component may render in nested layouts (e.g.
 * `(public)/layout.tsx` is nested inside `[locale]/layout.tsx`), and we want
 * the storage probe to run at most once per page load. The root layouts mount
 * `StorageAvailabilityProvider` exactly once each; every `GoogleScripts`
 * instance below reads from that single provider, so adding more nested
 * mounts never duplicates the probe.
 *
 * ─── Design tradeoff: analytics accuracy ───────────────────────────────
 * `GoogleAnalytics` (`@next/third-parties/google`) defaults to
 * `afterInteractive`, and that default is kept — but the gates above mean the
 * script is injected no earlier than the post-mount probe, and on a first
 * visit no earlier than the click that grants consent. First-visit
 * `page_view` events are therefore measurably less complete than they would
 * be with an ungated `afterInteractive` mount: a visitor who reads one page
 * and leaves without answering the banner is never counted at all.
 *
 * That is the accepted cost of not running analytics before permission, and
 * it is not recoverable by moving the script earlier — earlier is precisely
 * what consent forbids. What it does mean is that GA4 session counts
 * undercount real traffic by however many visitors never answer, so the
 * numbers are a floor rather than a measurement.
 */
export function GoogleScripts({ gaMeasurementId }: GoogleScriptsProps) {
  const availability = useStorageAvailabilityContext();
  const consent = useConsentDecision();

  // Render nothing during SSR / first render (both hooks report `null`) and
  // whenever either gate is closed. This keeps the server-rendered HTML
  // stable across all environments and guarantees zero outbound Google
  // requests until the visitor has said yes.
  if (!availability?.all) return null;
  if (consent !== 'granted') return null;

  return <>{gaMeasurementId && <GoogleAnalytics gaId={gaMeasurementId} />}</>;
}

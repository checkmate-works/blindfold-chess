'use client';

import Script from 'next/script';

import { GoogleAnalytics } from '@next/third-parties/google';

import { useStorageAvailabilityContext } from '@/lib/storage/StorageAvailabilityProvider';

import { CookieConsent } from './CookieConsent';

type GoogleScriptsProps = {
  /** Locale of the surrounding layout — forwarded to the CMP for banner language. */
  locale?: string;
  /** AdSense client publisher ID (`ca-pub-xxxx`). Pass `undefined` to skip injection. */
  adsensePublisherId?: string;
  /** GA4 measurement ID (`G-XXXX`). Pass `undefined` to skip injection. */
  gaMeasurementId?: string;
  /** CookieYes site ID. Pass `undefined` to skip injection. */
  cookieYesId?: string;
};

/**
 * Conditionally injects the AdSense loader, Google Analytics scripts, and the
 * CookieYes CMP banner — but only after a client-side probe confirms that
 * `localStorage`, `indexedDB`, and `document.cookie` are all writable.
 *
 * Why all-or-nothing: the CMP only matters if it can persist consent;
 * AdSense / GA only matter if the CMP can grant them consent. When any
 * storage layer is blocked (Firefox ETP, adblockers, sandboxed iframes,
 * private mode, etc.) every link of that chain is broken, so loading the
 * scripts at all just produces failed network requests and `NS_ERROR_NOT_-
 * INITIALIZED` Sentry noise. Per product decision, we render nothing in
 * that case.
 *
 * Why a shared context: this component may render in nested layouts (e.g.
 * `(public)/layout.tsx` is nested inside `[locale]/layout.tsx`), and we
 * want the storage probe to run at most once per page load. The root
 * layouts mount `StorageAvailabilityProvider` exactly once each; every
 * `GoogleScripts` instance below reads from that single provider, so
 * adding more nested mounts never duplicates the probe.
 *
 * ─── Design tradeoff: CMP banner latency ───────────────────────────────
 * All three Google scripts below use `strategy="lazyOnload"` + this
 * availability gate. Because the gate returns `null` until the post-mount
 * probe finishes AND `lazyOnload` defers injection until after
 * `window.onload`, the CookieYes banner first paints noticeably later
 * than a classic `afterInteractive` mount would. This is intentional:
 *
 *   - Core Web Vitals (LCP/INP) win from deferring all three scripts.
 *   - Uniform strategy avoids the CMP loading before the AdSense loader
 *     it is supposed to govern.
 *   - Users with blocked storage never see the banner anyway — for them
 *     the latency is infinite, and that is the desired behavior.
 *
 * Accepted cost: users with storage available see the consent banner a
 * few hundred ms later than they would with `afterInteractive`.
 *
 * Note on `GoogleAnalytics` (`@next/third-parties/google`): the helper
 * defaults to `afterInteractive`. We intentionally keep it on its default
 * rather than forcing it onto `lazyOnload` via a manual `<Script>`,
 * because:
 *   - First-visit GA page_view events are materially more accurate when
 *     GA runs before onload (otherwise a user who clicks away during load
 *     is never counted).
 *   - GA is small (~45 KB) and fetched via `gtag.js` with `async`; it does
 *     not block paint.
 *   - The availability gate above still short-circuits it when storage
 *     is blocked, which was the whole point of this module.
 * If analytics accuracy ever matters less than absolute uniformity, swap
 * the `<GoogleAnalytics>` below for a manual `<Script strategy="lazyOnload">`
 * that emits the equivalent gtag bootstrap.
 */
export function GoogleScripts({
  locale,
  adsensePublisherId,
  gaMeasurementId,
  cookieYesId,
}: GoogleScriptsProps) {
  const availability = useStorageAvailabilityContext();

  // Render nothing during SSR / first render (`null`) and when any storage
  // mechanism is blocked. This keeps the server-rendered HTML stable across
  // all environments and guarantees zero outbound Google requests when
  // storage is unavailable.
  if (!availability?.all) return null;

  return (
    <>
      {adsensePublisherId && (
        <Script
          id="adsbygoogle-loader"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePublisherId}`}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}
      {cookieYesId && <CookieConsent cookieYesId={cookieYesId} locale={locale} />}
      {gaMeasurementId && <GoogleAnalytics gaId={gaMeasurementId} />}
    </>
  );
}

import { IS_LOCAL_DEV } from '@/config';

/**
 * Client-read cookie used by the no-flash ad-hide pattern.
 *
 * @design
 * Why a cookie instead of `shouldShowAds()` in `AdSenseGuard`:
 * a server-side `cookies()` read during page rendering would opt the entire
 * page out of static generation (ISR/SSG). By moving the decision to a cookie
 * that the server SETS (on auth flow / subscription update) but NEVER READS
 * during page rendering, the ad-guard server component can stay static while
 * still hiding ads for paying users.
 *
 * Flow:
 *   1. The server sets `bfc_ads_hidden=1` during sign-in / checkout success /
 *      subscription page refresh when the user should not see ads.
 *   2. An inline no-flash script in `[locale]/layout.tsx` reads the cookie
 *      synchronously and sets `data-ads-hidden="true"` on `<html>`.
 *   3. A CSS rule in `globals.css` hides `.ad-slot-wrapper` / `.adsbygoogle`
 *      elements when the attribute is set.
 *   4. The client `AdSenseDisplay` reads the same attribute and skips the
 *      `adsbygoogle.push({})` call so no network request is made.
 *
 * This file intentionally contains only cookie NAME / OPTIONS constants —
 * no DB-hitting helpers. That keeps it importable from route handlers
 * without pulling `server-only` into jsdom-based tests. The async
 * entitlement check lives in `./ads-hidden-cookie-compute.ts` (server-only).
 */
export const ADS_HIDDEN_COOKIE_NAME = 'bfc_ads_hidden';

/**
 * 7 days. The cookie is a hint only — misses (e.g., user purchases a sub
 * between refreshes) are self-correcting on the next authenticated page load
 * via the request proxy on `/mypage/subscription`. Keeping the TTL short means stale `'1'`
 * values (e.g., after a subscription lapses) also self-correct.
 */
export const ADS_HIDDEN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type AdsHiddenCookieOptions = {
  path: string;
  maxAge: number;
  sameSite: 'lax';
  secure: boolean;
  httpOnly: false;
};

/**
 * Cookie options for `bfc_ads_hidden`.
 *
 * - `httpOnly: false` — the client-side inline no-flash script must read it.
 * - `sameSite: 'lax'` — cookie should travel with top-level navigations
 *   (OAuth redirects) but not with cross-site iframes.
 * - `secure` — true in production, false in local dev over plain http.
 */
export function adsHiddenCookieOptions(): AdsHiddenCookieOptions {
  return {
    path: '/',
    maxAge: ADS_HIDDEN_COOKIE_MAX_AGE_SEC,
    sameSite: 'lax',
    secure: !IS_LOCAL_DEV,
    httpOnly: false,
  };
}

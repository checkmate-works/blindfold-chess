import { ADS_HIDDEN_COOKIE_NAME } from './ads-hidden-cookie';

const ADS_HIDDEN_COOKIE_MATCH = new RegExp(`(?:^|; )${ADS_HIDDEN_COOKIE_NAME}=1(?:;|$)`);

/**
 * Re-assert `<html data-ads-hidden>` from the `bfc_ads_hidden` cookie that
 * `getSessionUser()` just (re)wrote on the server. The inline bootstrap
 * script in `<head>` (see `AdHideBootstrapScript`) runs only at initial
 * document parse, so cookies written after that — chiefly the very first
 * sign-in within a session — would never be reflected on the attribute.
 * `AdSenseDisplay` / `AdSenseInFeed` gate `push()` solely on this attribute,
 * so without this re-assertion the user would see ads on subsequent
 * client-side navigations (e.g., language switch) despite being entitled
 * to hide them. A reload masks the symptom because the bootstrap then runs
 * with the cookie already present.
 *
 * Lives with the other ads-hidden plumbing; the auth provider calls it at
 * session-resolution time because sign-in is when the cookie gets rewritten.
 */
export function syncAdsHiddenAttribute(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (ADS_HIDDEN_COOKIE_MATCH.test(document.cookie)) {
    root.setAttribute('data-ads-hidden', 'true');
  } else {
    root.removeAttribute('data-ads-hidden');
  }
}

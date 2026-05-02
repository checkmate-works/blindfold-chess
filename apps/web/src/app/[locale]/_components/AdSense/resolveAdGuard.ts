import { IS_LOCAL_DEV } from '@/config';

import { isAdsEnabled } from '@/lib/ads/ad';
import { isNoAdsScope } from '@/lib/ads/no-ads-scope';

export type AdGuardResult = 'show' | 'placeholder' | 'hidden';

/**
 * Resolves the ad-guard decision without consulting per-user state.
 *
 * Per-user hiding (subscribers / `ad_free` grant holders) is delegated to
 * the `bfc_ads_hidden` cookie + CSS rule — see
 * `@/lib/ads/ads-hidden-cookie.ts`. This keeps consumer pages free of a
 * `cookies()` read, which is the prerequisite for ISR/SSG.
 *
 * Priority:
 *   1. `isNoAdsScope()` — layout-declared opt-out (e.g. `(no-ads)` route
 *      group). Wins over everything.
 *   2. `isAdsEnabled()` — global `ads_enabled` flag. Cached via
 *      `unstable_cache`; does not read cookies.
 *   3. `IS_LOCAL_DEV` — render a visible placeholder locally.
 *   4. Otherwise: return `'show'` so the caller renders the real slot.
 *
 * Note: since `AdSenseGuard` and in-feed slot consumers now inline these
 * same checks (they need to own their `.ad-slot-wrapper` hook for the CSS
 * hide-rule), this function is kept for any future consumer that wants
 * a uniform decision type.
 */
export async function resolveAdGuard(): Promise<AdGuardResult> {
  if (isNoAdsScope()) return 'hidden';
  if (!(await isAdsEnabled())) return 'hidden';
  if (IS_LOCAL_DEV) return 'placeholder';
  return 'show';
}

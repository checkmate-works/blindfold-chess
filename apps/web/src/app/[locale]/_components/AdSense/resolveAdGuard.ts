import { IS_LOCAL_DEV } from '@/config';

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
 *   2. `IS_LOCAL_DEV` — render a visible placeholder locally.
 *   3. Otherwise: return `'show'` so the caller renders the real slot.
 */
export function resolveAdGuard(): AdGuardResult {
  if (isNoAdsScope()) return 'hidden';
  if (IS_LOCAL_DEV) return 'placeholder';
  return 'show';
}

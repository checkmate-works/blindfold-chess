import { IS_LOCAL_DEV } from '@/config';

import { shouldShowAds } from '@/lib/ads/ad';
import { isNoAdsScope } from '@/lib/ads/no-ads-scope';

export type AdGuardResult = 'show' | 'placeholder' | 'hidden';

export async function resolveAdGuard(): Promise<AdGuardResult> {
  // Layout-declared opt-out (e.g., pages under a `(no-ads)` route group).
  //
  // Flow: a layout calls `markNoAdsScope()` (see `src/lib/ads/no-ads-scope.ts`)
  // → `resolveAdGuard()` returns `'hidden'` here with highest priority, before
  // consulting user / ads-enabled state.
  if (isNoAdsScope()) return 'hidden';

  const showAds = await shouldShowAds();
  if (!showAds) return 'hidden';
  if (IS_LOCAL_DEV) return 'placeholder';
  return 'show';
}

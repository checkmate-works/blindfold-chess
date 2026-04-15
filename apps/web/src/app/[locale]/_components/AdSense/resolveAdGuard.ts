import { IS_LOCAL_DEV } from '@/config';

import { shouldShowAds } from '@/lib/ads/ad';

export type AdGuardResult = 'show' | 'placeholder' | 'hidden';

export async function resolveAdGuard(): Promise<AdGuardResult> {
  const showAds = await shouldShowAds();
  if (!showAds) return 'hidden';
  if (IS_LOCAL_DEV) return 'placeholder';
  return 'show';
}

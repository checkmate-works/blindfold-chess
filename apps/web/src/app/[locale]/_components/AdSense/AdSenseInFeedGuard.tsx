import {
  ADSENSE_INFEED_LAYOUT_KEY_DESKTOP,
  ADSENSE_INFEED_LAYOUT_KEY_MOBILE,
  ADSENSE_SLOT_INFEED_DESKTOP,
  ADSENSE_SLOT_INFEED_MOBILE,
  IS_LOCAL_DEV,
} from '@/config';

import { isAdsEnabled } from '@/lib/ads/ad';
import { isNoAdsScope } from '@/lib/ads/no-ads-scope';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseInFeed } from './AdSenseInFeed';

/**
 * In-feed counterpart to `AdSenseGuard`. Same principle: no `cookies()`
 * read, per-user hiding handled by the `bfc_ads_hidden` cookie + CSS rule.
 * See `AdSenseGuard` and `@/lib/ads/ads-hidden-cookie.ts` for details.
 */
export async function AdSenseInFeedGuard() {
  if (isNoAdsScope()) return null;
  if (!(await isAdsEnabled())) return null;
  if (IS_LOCAL_DEV) return <AdPlaceholder slot="native-ad" />;

  return (
    <div className="ad-slot-wrapper" data-ad-slot="native-ad">
      {ADSENSE_SLOT_INFEED_DESKTOP && ADSENSE_INFEED_LAYOUT_KEY_DESKTOP && (
        <div className="hidden md:block">
          <AdSenseInFeed
            slotId={ADSENSE_SLOT_INFEED_DESKTOP}
            layoutKey={ADSENSE_INFEED_LAYOUT_KEY_DESKTOP}
          />
        </div>
      )}
      {ADSENSE_SLOT_INFEED_MOBILE && ADSENSE_INFEED_LAYOUT_KEY_MOBILE && (
        <div className="block md:hidden">
          <AdSenseInFeed
            slotId={ADSENSE_SLOT_INFEED_MOBILE}
            layoutKey={ADSENSE_INFEED_LAYOUT_KEY_MOBILE}
          />
        </div>
      )}
    </div>
  );
}

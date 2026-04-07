import {
  ADSENSE_INFEED_LAYOUT_KEY_DESKTOP,
  ADSENSE_INFEED_LAYOUT_KEY_MOBILE,
  ADSENSE_SLOT_INFEED_DESKTOP,
  ADSENSE_SLOT_INFEED_MOBILE,
} from '@/config';

import { shouldShowAds } from '@/lib/ad';

import { AdSenseInFeed } from './AdSenseInFeed';

export async function AdSenseInFeedGuard() {
  const showAds = await shouldShowAds();
  if (!showAds) return null;

  return (
    <>
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
    </>
  );
}

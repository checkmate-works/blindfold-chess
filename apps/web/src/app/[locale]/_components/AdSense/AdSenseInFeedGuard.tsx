import {
  ADSENSE_INFEED_LAYOUT_KEY_DESKTOP,
  ADSENSE_INFEED_LAYOUT_KEY_MOBILE,
  ADSENSE_SLOT_INFEED_DESKTOP,
  ADSENSE_SLOT_INFEED_MOBILE,
} from '@/config';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseInFeed } from './AdSenseInFeed';
import { resolveAdGuard } from './resolveAdGuard';

export async function AdSenseInFeedGuard() {
  const guard = await resolveAdGuard();
  if (guard === 'hidden') return null;
  if (guard === 'placeholder') return <AdPlaceholder slot="native-ad" />;

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

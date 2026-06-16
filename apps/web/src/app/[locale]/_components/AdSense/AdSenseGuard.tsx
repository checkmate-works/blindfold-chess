import { IS_LOCAL_DEV } from '@/config';

import { isNoAdsScope } from '@/lib/ads/no-ads-scope';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseDisplay } from './AdSenseDisplay';
import { AD_SLOT_DIMENSIONS } from './ad-slot-dimensions';

type Props = {
  slot: 'content-middle' | 'content-bottom';
  slotId: string;
  className?: string;
};

/**
 * Renders an AdSense slot guarded by the `(no-ads)` route group opt-out
 * (`isNoAdsScope()`).
 *
 * Per-user hiding (subscribers / ad_free grant holders) is handled
 * downstream via the `bfc_ads_hidden` cookie and a CSS rule — see
 * `@/lib/ads/ads-hidden-cookie.ts`. That decoupling keeps this component
 * free of `cookies()` reads, so consumer pages stay static/ISR.
 *
 * The `<div className="ad-slot-wrapper">` is the CSS hook used by the
 * no-flash rule in `globals.css` to hide the reserved ad space before
 * paint when the cookie says the current viewer has opted out. The
 * placeholder rendered in `IS_LOCAL_DEV` is wrapped in the same hook so
 * the ad-free entitlement flow (redemption / subscription) is verifiable
 * end-to-end locally — without the wrapper the CSS rule would have no
 * selector match and the placeholder would stay visible forever, masking
 * what is in fact a working hide.
 *
 * This wrapper is the one element in the ad stack that is server-rendered
 * regardless of the storage probe or fill state, so it is also where the
 * slot's height is reserved (`AD_SLOT_DIMENSIONS[slot].reserveMinH`). The
 * `min-height` holds the space from first paint, so the later
 * `AdSenseDisplay` mount and AdSense fill drop into a pre-sized box instead
 * of shoving the page down — the fix for the mobile CLS regression. For
 * opted-out viewers the `data-ads-hidden` no-flash rule sets
 * `display:none`, which collapses the reserved height too, so they see no
 * gap.
 */
export async function AdSenseGuard({ slot, slotId, className }: Props) {
  if (isNoAdsScope()) return null;

  return (
    <div className={`ad-slot-wrapper ${AD_SLOT_DIMENSIONS[slot].reserveMinH}`} data-ad-slot={slot}>
      {IS_LOCAL_DEV ? (
        <AdPlaceholder slot={slot} />
      ) : (
        <AdSenseDisplay slot={slot} slotId={slotId} className={className} />
      )}
    </div>
  );
}

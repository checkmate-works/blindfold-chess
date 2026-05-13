import { IS_LOCAL_DEV } from '@/config';

import { isNoAdsScope } from '@/lib/ads/no-ads-scope';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseDisplay } from './AdSenseDisplay';

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
 */
export async function AdSenseGuard({ slot, slotId, className }: Props) {
  if (isNoAdsScope()) return null;

  return (
    <div className="ad-slot-wrapper" data-ad-slot={slot}>
      {IS_LOCAL_DEV ? (
        <AdPlaceholder slot={slot} />
      ) : (
        <AdSenseDisplay slot={slot} slotId={slotId} className={className} />
      )}
    </div>
  );
}

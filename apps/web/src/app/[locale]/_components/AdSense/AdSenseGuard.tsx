import { IS_LOCAL_DEV } from '@/config';

import { isAdsEnabled } from '@/lib/ads/ad';
import { isNoAdsScope } from '@/lib/ads/no-ads-scope';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseDisplay } from './AdSenseDisplay';

type Props = {
  slot: 'content-middle' | 'content-bottom';
  slotId: string;
  className?: string;
};

/**
 * Renders an AdSense slot guarded by:
 *   1. The `(no-ads)` route group opt-out (`isNoAdsScope()`).
 *   2. The global `ads_enabled` setting (`isAdsEnabled()` — cached, no
 *      `cookies()` access).
 *
 * Per-user hiding (subscribers / ad_free grant holders) is handled
 * downstream via the `bfc_ads_hidden` cookie and a CSS rule — see
 * `@/lib/ads/ads-hidden-cookie.ts`. That decoupling keeps this component
 * free of `cookies()` reads, so consumer pages stay static/ISR.
 *
 * The `<div className="ad-slot-wrapper">` is the CSS hook used by the
 * no-flash rule in `globals.css` to hide the reserved ad space before
 * paint when the cookie says the current viewer has opted out.
 */
export async function AdSenseGuard({ slot, slotId, className }: Props) {
  if (isNoAdsScope()) return null;
  if (!(await isAdsEnabled())) return null;
  if (IS_LOCAL_DEV) return <AdPlaceholder slot={slot} />;

  return (
    <div className="ad-slot-wrapper" data-ad-slot={slot}>
      <AdSenseDisplay slot={slot} slotId={slotId} className={className} />
    </div>
  );
}

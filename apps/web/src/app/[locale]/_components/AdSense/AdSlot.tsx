import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';

import { getActiveCreatives } from '@/lib/ads/ad';
import { isNoAdsScope } from '@/lib/ads/no-ads-scope';
import { isBannerPayload } from '@/lib/ads/payload';
import { AD_SLOTS } from '@/lib/ads/registry';
import type { AdSelection, BannerSlot } from '@/lib/ads/registry';
import { pickCreative } from '@/lib/ads/select';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseDisplay } from './AdSenseDisplay';
import { BannerCreative } from './BannerCreative';
import { AD_SLOT_DIMENSIONS } from './ad-slot-dimensions';

const ADSENSE_SLOT_ID: Record<BannerSlot, string | undefined> = {
  'content-middle': ADSENSE_SLOT_CONTENT_MIDDLE,
  'content-bottom': ADSENSE_SLOT_CONTENT_BOTTOM,
};

type Props = {
  slot: BannerSlot;
  /** Overrides the slot's default selection (fixed slots default to `priority`). */
  selection?: AdSelection;
  className?: string;
};

/**
 * The single mandatory boundary for fixed-placement ads. Given a slot it:
 *
 * 1. respects the `(no-ads)` whole-page opt-out (`isNoAdsScope`);
 * 2. resolves the slot's active admin creatives (cached, priority-ordered);
 * 3. fills the slot with the chosen creative (waterfall), else the AdSense
 *    fallback for that slot;
 * 4. wraps everything in `.ad-slot-wrapper` + the reserved height, so ad-free
 *    viewers (subscription or coin `ad_free` grant) hit the `bfc_ads_hidden`
 *    no-flash CSS hide uniformly — first-party or AdSense.
 *
 * Call sites only choose *placement* (where to render this) and, optionally,
 * the selection mode; whether the viewer sees ads and what fills the slot are
 * owned here. The only sanctioned way to render a fixed-placement ad, so one
 * can't be shipped outside this hide/fallback boundary.
 */
export async function AdSlot({ slot, selection, className }: Props) {
  if (isNoAdsScope()) return null;

  const sel = selection ?? AD_SLOTS[slot].defaultSelection;
  const banners = (await getActiveCreatives(slot)).flatMap((c) =>
    isBannerPayload(c.payload) ? [{ href: c.href, payload: c.payload }] : []
  );

  const wrapperClass = `ad-slot-wrapper ${AD_SLOT_DIMENSIONS[slot].reserveMinH}`;

  if (banners.length > 0) {
    const chosen = pickCreative(banners, sel);
    return (
      <div className={wrapperClass} data-ad-slot={slot}>
        <BannerCreative payload={chosen.payload} href={chosen.href} label="PR" />
      </div>
    );
  }

  // No creative → AdSense fallback. Locally that's the placeholder; in
  // production it needs a configured slot id, otherwise (as the old
  // per-call-site `IS_LOCAL_DEV || ADSENSE_SLOT_*` guard did) render nothing
  // rather than an empty `<ins>` / a reserved gap that never fills.
  const slotId = ADSENSE_SLOT_ID[slot];
  if (!IS_LOCAL_DEV && !slotId) return null;

  return (
    <div className={wrapperClass} data-ad-slot={slot}>
      {IS_LOCAL_DEV ? (
        <AdPlaceholder slot={slot} />
      ) : (
        <AdSenseDisplay slot={slot} slotId={slotId ?? ''} className={className} />
      )}
    </div>
  );
}

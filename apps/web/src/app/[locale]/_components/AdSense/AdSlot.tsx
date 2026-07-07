import { isNoAdsScope } from '@/lib/ads/no-ads-scope';
import type { AdSelection, BannerSlot } from '@/lib/ads/registry';

import { AdSlotClient } from './AdSlotClient';

type Props = {
  slot: BannerSlot;
  /** Overrides the slot's default selection (fixed slots default to `priority`). */
  selection?: AdSelection;
};

/**
 * The single mandatory boundary for fixed-placement ads. A thin server gate:
 * honors the `(no-ads)` whole-page opt-out (`isNoAdsScope`, which is
 * request-cache based and does NOT force dynamic, so ad-bearing pages stay
 * static/ISR), then hands off to {@link AdSlotClient}, which resolves the
 * country-appropriate creative (waterfall) or AdSense fallback client-side
 * and applies the ad-free hide via `.ad-slot-wrapper`.
 *
 * Call sites only choose *placement* (and optionally selection); whether the
 * viewer sees ads and what fills the slot are owned here + in the client. The
 * only sanctioned way to render a fixed-placement ad.
 */
export function AdSlot({ slot, selection }: Props) {
  if (isNoAdsScope()) return null;
  return <AdSlotClient slot={slot} selection={selection} />;
}

'use client';

import { useEffect, useState } from 'react';

import { ADSENSE_SLOT_CONTENT_BOTTOM, ADSENSE_SLOT_CONTENT_MIDDLE, IS_LOCAL_DEV } from '@/config';

import type { AdSlotResolution } from '@/lib/ads/ad-slot-resolution';
import type { AdSelection, BannerSlot } from '@/lib/ads/registry';

import { AdPlaceholder } from './AdPlaceholder';
import { AdSenseDisplay } from './AdSenseDisplay';
import { BannerCreative } from './BannerCreative';
import { AD_SLOT_DIMENSIONS } from './ad-slot-dimensions';

const ADSENSE_SLOT_ID: Record<BannerSlot, string | undefined> = {
  'content-middle': ADSENSE_SLOT_CONTENT_MIDDLE,
  'content-bottom': ADSENSE_SLOT_CONTENT_BOTTOM,
};

type Resolution =
  | { status: 'loading' }
  | { status: 'creative'; creative: NonNullable<AdSlotResolution['creative']> }
  | { status: 'fallback' };

/**
 * Client half of `<AdSlot>`. The wrapper (reserved height + `.ad-slot-wrapper`
 * hide hook) is server-rendered so there's no CLS and the `bfc_ads_hidden`
 * CSS still collapses it for ad-free viewers. On mount it asks the
 * `/api/ad-slot/[slot]` route — which reads the request's `x-vercel-ip-country`
 * — for the country-appropriate creative, then paints the banner or the
 * AdSense fallback. Resolving client-side is what lets the host pages stay
 * static/ISR (no per-request geo in page render).
 */
export function AdSlotClient({ slot, selection }: { slot: BannerSlot; selection?: AdSelection }) {
  const [res, setRes] = useState<Resolution>({ status: 'loading' });

  useEffect(() => {
    // Ad-free viewers: the `.ad-slot-wrapper` is already display:none, so skip
    // the network round-trip entirely.
    if (document.documentElement.dataset.adsHidden === 'true') return;

    let cancelled = false;
    const query = selection ? `?selection=${selection}` : '';
    fetch(`/api/ad-slot/${slot}${query}`)
      // Reject with a real Error, never a bare `Promise.reject()`. The `.catch`
      // below swallows it either way, but the client Sentry config drops
      // reason-less unhandled rejections wholesale (see `beforeSend` in
      // `src/instrumentation-client.ts`) — so a rejection carrying `undefined`
      // would become invisible if this chain ever lost its handler.
      .then((r) =>
        r.ok
          ? (r.json() as Promise<AdSlotResolution>)
          : Promise.reject(new Error(`ad-slot ${slot} resolution failed with ${r.status}`))
      )
      .then((data) => {
        if (cancelled) return;
        setRes(
          data.creative ? { status: 'creative', creative: data.creative } : { status: 'fallback' }
        );
      })
      .catch(() => {
        if (!cancelled) setRes({ status: 'fallback' });
      });
    return () => {
      cancelled = true;
    };
  }, [slot, selection]);

  const wrapperClass = `ad-slot-wrapper ${AD_SLOT_DIMENSIONS[slot].reserveMinH}`;
  const slotId = ADSENSE_SLOT_ID[slot];

  return (
    <div className={wrapperClass} data-ad-slot={slot}>
      {res.status === 'creative' ? (
        <BannerCreative payload={res.creative.payload} href={res.creative.href} label="PR" />
      ) : res.status === 'fallback' ? (
        IS_LOCAL_DEV ? (
          <AdPlaceholder slot={slot} />
        ) : slotId ? (
          <AdSenseDisplay slot={slot} slotId={slotId} />
        ) : null
      ) : null}
    </div>
  );
}

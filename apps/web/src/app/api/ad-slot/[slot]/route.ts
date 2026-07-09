import { NextResponse } from 'next/server';

import { getBannerCreatives } from '@/lib/ads/ad';
import type { AdSlotResolution } from '@/lib/ads/ad-slot-resolution';
import { getRequestCountry } from '@/lib/ads/country';
import { isAdSelection, isAdSlot, isBannerSlot, selectionForSlot } from '@/lib/ads/registry';
import { pickCreative } from '@/lib/ads/select';

/**
 * Country-aware resolution for a fixed banner slot. Called client-side by
 * `AdSlotClient` so the ad-bearing pages themselves stay static/ISR: the
 * per-request geo (`x-vercel-ip-country`) lives here, not in page render.
 *
 * Returns the highest-priority active creative whose `target_country` admits
 * the visitor's country (or is global), or `{ creative: null }` when none
 * qualifies (the client then falls back to AdSense). Never cached — the
 * response varies by country and rotation.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;

  if (!isAdSlot(slot) || !isBannerSlot(slot)) {
    return NextResponse.json({ error: 'unknown_slot' }, { status: 404 });
  }

  const selParam = new URL(request.url).searchParams.get('selection');
  const selection = selParam && isAdSelection(selParam) ? selParam : selectionForSlot(slot);

  const country = getRequestCountry(request.headers);
  const eligible = await getBannerCreatives(slot, country);

  const resolution: AdSlotResolution = {
    creative: eligible.length > 0 ? pickCreative(eligible, selection) : null,
  };

  return NextResponse.json(resolution, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

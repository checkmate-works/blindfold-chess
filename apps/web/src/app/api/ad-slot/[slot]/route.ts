import { NextResponse } from 'next/server';

import { getActiveCreatives } from '@/lib/ads/ad';
import type { AdSlotResolution } from '@/lib/ads/ad-slot-resolution';
import { filterByCountry, getRequestCountry } from '@/lib/ads/country';
import { isBannerPayload } from '@/lib/ads/payload';
import { AD_SELECTIONS, AD_SLOTS, isBannerSlot } from '@/lib/ads/registry';
import type { AdSelection } from '@/lib/ads/registry';
import { pickCreative } from '@/lib/ads/select';

/**
 * Country-aware resolution for a fixed banner slot. Called client-side by
 * `AdSlotClient` so the ad-bearing pages themselves stay static/ISR: the
 * per-request geo (`x-vercel-ip-country`) lives here, not in page render.
 *
 * Returns the highest-priority active creative whose `target_countries`
 * allow-list admits the visitor's country, or `{ creative: null }` when none
 * qualifies (the client then falls back to AdSense). Never cached — the
 * response varies by country and rotation.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;

  if (!isBannerSlot(slot as never) || !(slot in AD_SLOTS)) {
    return NextResponse.json({ error: 'unknown_slot' }, { status: 404 });
  }

  const url = new URL(_request.url);
  const selParam = url.searchParams.get('selection');
  const selection: AdSelection = (AD_SELECTIONS as readonly string[]).includes(selParam ?? '')
    ? (selParam as AdSelection)
    : AD_SLOTS[slot as keyof typeof AD_SLOTS].defaultSelection;

  const country = getRequestCountry(_request.headers);

  const pool = (await getActiveCreatives(slot as never)).flatMap((c) =>
    isBannerPayload(c.payload)
      ? [{ href: c.href, payload: c.payload, targetCountries: c.targetCountries }]
      : []
  );
  const eligible = filterByCountry(pool, country);

  const resolution: AdSlotResolution = {
    creative:
      eligible.length > 0
        ? (() => {
            const chosen = pickCreative(eligible, selection);
            return { href: chosen.href, payload: chosen.payload };
          })()
        : null,
  };

  return NextResponse.json(resolution, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

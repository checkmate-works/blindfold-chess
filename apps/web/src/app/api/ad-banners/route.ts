import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getAdBannerBySlot, isAdsEnabled } from '@/lib/ads/ad';

export async function GET(request: NextRequest) {
  const slot = request.nextUrl.searchParams.get('slot');

  if (!slot) {
    return NextResponse.json({ error: 'slot is required' }, { status: 400 });
  }

  const enabled = await isAdsEnabled();
  if (!enabled) {
    return NextResponse.json({ data: null }, { headers: cacheHeaders() });
  }

  const config = await getAdBannerBySlot(slot);

  return NextResponse.json({ data: config ?? null }, { headers: cacheHeaders() });
}

function cacheHeaders(): HeadersInit {
  return {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  };
}

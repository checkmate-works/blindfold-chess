import type { BannerPayload, NativeCardPayload } from '@/lib/ads/payload';

import { adCreatives, db } from '../index';

// ---------------------------------------------------------------------------
// Initial data: ad creatives (DB is source of truth, insert once only)
// ---------------------------------------------------------------------------

type SeedCreative = {
  kind: string;
  slot: string;
  href: string;
  sortOrder: number;
  payload: BannerPayload | NativeCardPayload;
};

// Deliberately NO `feed-native-ad` seed: at launch nothing is configured, so
// the in-feed slot falls back to AdSense — the intended "no visible change on
// release" state. Native-card creatives (Amazon/Awin affiliates) are added by
// admins later. The banner rows are example placeholders for the (not yet
// publicly rendered) banner slots and are harmless if seeded in production.
const seedCreatives: SeedCreative[] = [
  {
    kind: 'banner',
    slot: 'banner-wide',
    href: 'https://example.com',
    sortOrder: 0,
    payload: {
      imagePath: '/images/banners/banner1.webp',
      alt: 'Advertisement',
      width: 960,
      height: 208,
    },
  },
  {
    kind: 'banner',
    slot: 'banner-standard',
    href: 'https://example.com',
    sortOrder: 0,
    payload: {
      imagePath: '/images/banners/banner2.webp',
      alt: 'Advertisement',
      width: 400,
      height: 400,
    },
  },
];

export async function seedAds() {
  console.log('Seeding ad creatives...');

  // slot is intentionally non-unique (creatives rotate within a placement),
  // so there is no natural conflict target — seed only when empty.
  const existing = await db.select({ id: adCreatives.id }).from(adCreatives).limit(1);
  if (existing.length > 0) return;

  await db.insert(adCreatives).values(seedCreatives);
}

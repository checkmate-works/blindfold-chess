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

// Deliberately empty at launch: nothing is configured for any slot, so every
// slot (banner and in-feed alike) falls back to AdSense — the intended "no
// visible change on release" state. Admins add real creatives via /admin/ads
// afterward.
const seedCreatives: SeedCreative[] = [];

export async function seedAds() {
  if (seedCreatives.length === 0) return;

  console.log('Seeding ad creatives...');

  // slot is intentionally non-unique (creatives rotate within a placement),
  // so there is no natural conflict target — seed only when empty.
  const existing = await db.select({ id: adCreatives.id }).from(adCreatives).limit(1);
  if (existing.length > 0) return;

  await db.insert(adCreatives).values(seedCreatives);
}

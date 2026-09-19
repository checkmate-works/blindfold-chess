import type { NativeCardPayload } from '@/lib/ads/payload';

import { adCreatives, db } from '../index';

// ---------------------------------------------------------------------------
// Initial data: ad creatives (DB is source of truth, insert once only)
// ---------------------------------------------------------------------------

type SeedCreative = {
  kind: string;
  slot: string;
  href: string;
  sortOrder: number;
  payload: NativeCardPayload;
};

// Deliberately empty: a slot with no creative renders nothing, which is the
// correct state for a fresh database. Admins add real creatives via
// /admin/ads.
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

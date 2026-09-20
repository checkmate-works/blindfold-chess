import { copyToTranslationRows } from '@/lib/ads/copy';
import type { CreativeCopy } from '@/lib/ads/copy';
import type { AdSlot } from '@/lib/ads/registry';
import { kindForSlot } from '@/lib/ads/registry';
import type { NativeCardThumbnail } from '@/lib/ads/thumbnail';
import { thumbnailToColumns } from '@/lib/ads/thumbnail';

import { adCreativeTranslations, adCreatives, db } from '../index';

// ---------------------------------------------------------------------------
// Initial data: ad creatives (DB is source of truth, insert once only)
// ---------------------------------------------------------------------------

/**
 * A creative as the seed writes it. The `id` is fixed rather than generated
 * because it is the only key this table has — `slot` is deliberately
 * non-unique, creatives rotate within a placement — and it is also the
 * sub-ID the affiliate network reports clicks under, so it has to be the
 * same in every environment the row lands in.
 */
type SeedCreative = {
  id: string;
  slot: AdSlot;
  href: string;
  isActive: boolean;
  sortOrder: number;
  icon?: string;
  thumbnail?: NativeCardThumbnail;
  copy: CreativeCopy;
};

// Deliberately empty: a slot with no creative renders nothing, which is the
// correct state for a fresh database. Admins add real creatives via
// /admin/ads.
const seedCreatives: SeedCreative[] = [];

/**
 * Insert-only. A creative the seed has already written is left exactly as the
 * admin has since edited it: the conflict target is the fixed `id`, so a
 * re-run writes nothing over a row that exists and only adds rows that are
 * new. Copy rows follow the same rule on `(creative_id, locale)`.
 */
export async function seedAds() {
  if (seedCreatives.length === 0) return;

  console.log('Seeding ad creatives...');

  for (const creative of seedCreatives) {
    const kind = kindForSlot(creative.slot);
    await db
      .insert(adCreatives)
      .values({
        id: creative.id,
        kind,
        slot: creative.slot,
        href: creative.href,
        isActive: creative.isActive,
        sortOrder: creative.sortOrder,
        icon: kind === 'native_tile' ? (creative.icon ?? null) : null,
        avatarImagePath: null,
        avatarAlt: null,
        // No thumbnail leaves the columns to their defaults: the default board.
        ...(creative.thumbnail ? thumbnailToColumns(creative.thumbnail) : {}),
      })
      .onConflictDoNothing({ target: adCreatives.id });

    const copyRows = copyToTranslationRows(creative.id, creative.copy);
    if (copyRows.length > 0) {
      await db
        .insert(adCreativeTranslations)
        .values(copyRows)
        .onConflictDoNothing({
          target: [adCreativeTranslations.creativeId, adCreativeTranslations.locale],
        });
    }
  }
}

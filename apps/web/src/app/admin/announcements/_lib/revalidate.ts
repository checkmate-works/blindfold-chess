import { revalidateTag } from 'next/cache';

import { ANNOUNCEMENTS_CACHE_TAG } from '@/lib/cache-tags';

/**
 * Invalidate the `unstable_cache`-wrapped banner fetch after an announcement
 * mutation.
 *
 * Deliberately only the tag: each ISR page picks the change up on its next
 * natural revalidation cycle, whereas a layout-wide `revalidatePath` here
 * would evict every ISR entry under `[locale]/(public)` — which previously
 * caused a 305x ISR Writes spike on Vercel. All three mutations carried that
 * warning as a copied comment, which is one place too few for it to be read
 * by whoever adds the fourth.
 */
export function revalidateAnnouncements(): void {
  revalidateTag(ANNOUNCEMENTS_CACHE_TAG, { expire: 60 });
}

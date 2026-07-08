import { revalidatePath, revalidateTag } from 'next/cache';

import { AD_CREATIVES_CACHE_TAG } from '@/lib/ads/ad';

/**
 * Invalidate everything an ad-creative mutation can affect: the admin surface
 * (`/admin/ads` and every `/admin/ads/[slot]` child — hence `'layout'`) and
 * the tag-cached creative pool the public slots read. Every mutation path —
 * the server actions and the image upload/removal route — must call this;
 * hand-rolling the pair risks the partial coverage this helper replaced
 * (actions that revalidated the overview but not the slot pages, and an image
 * route that revalidated nothing).
 */
export function revalidateAdCreatives(): void {
  revalidatePath('/admin/ads', 'layout');
  revalidateTag(AD_CREATIVES_CACHE_TAG, { expire: 60 });
}

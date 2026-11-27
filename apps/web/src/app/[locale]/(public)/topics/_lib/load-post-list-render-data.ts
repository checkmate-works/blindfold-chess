import { getTranslations } from 'next-intl/server';

import { resolveNativeAds } from '@/lib/ads/ad';
import type { AdSlot } from '@/lib/ads/registry';
import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Everything a topic page has to resolve on the server before it can hand a
 * page of posts to its (client) post cards, fetched in one round:
 *
 * - `attachments`: each visible post's attachment, keyed by post id. The post
 *   cards are client components and cannot call the server-only
 *   `getAttachmentsForPosts` themselves, so the page pre-resolves the slot.
 *   Posts with no attachment row are absent from the map.
 * - `fallbackVideoTitle`: the title a video attachment renders with when the
 *   provider gave none.
 * - `nativeAdCreatives`: the native ads interleaved with the posts.
 *   Server-gated — an ad-free reader gets an empty pool, and an empty pool
 *   places no cards at all.
 */
export async function loadPostListRenderData({
  postIds,
  locale,
  userId,
  adSlot,
}: {
  postIds: readonly string[];
  locale: Locale;
  userId: string | null;
  adSlot: AdSlot;
}) {
  const [attachments, tVideo, { creatives: nativeAdCreatives }] = await Promise.all([
    getAttachmentsForPosts(postIds),
    getTranslations({ locale, namespace: 'postVideoAttachmentRender' }),
    resolveNativeAds(adSlot, userId, locale),
  ]);
  return { attachments, fallbackVideoTitle: tVideo('fallbackTitle'), nativeAdCreatives };
}

'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

export async function toggleLike(postId: string, locale: string, slug: string) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: slug,
    topicType: 'chunk',
    urlSegment: 'chunks',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
    revalidate: () => [`/${locale}/chunks/${slug}`, `/${locale}/chunks/${slug}/posts/${postId}`],
  });
}

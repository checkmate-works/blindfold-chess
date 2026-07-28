'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

export async function toggleChunkLike(postId: string, locale: string, slug: string) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: slug,
    topicType: 'chunk',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
  });
}

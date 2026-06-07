'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

export async function toggleRepertoirePostLike(
  postId: string,
  locale: string,
  repertoireId: string
) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: repertoireId,
    topicType: 'repertoire',
    urlSegment: 'repertoires',
    validateTopic: async (id) => (await getRepertoireById(id)) !== null,
    revalidate: () => [`/${locale}/repertoires/${repertoireId}`],
  });
}

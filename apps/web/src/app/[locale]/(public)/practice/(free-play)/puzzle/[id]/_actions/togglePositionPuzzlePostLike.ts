'use server';

import { getPositionById } from '@/lib/positions/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

export async function togglePositionPuzzlePostLike(
  postId: string,
  locale: string,
  positionId: string
) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: positionId,
    topicType: 'position_puzzle',
    urlSegment: 'practice/puzzle',
    validateTopic: async (id) => (await getPositionById({ id, type: 'puzzle' })) !== null,
    revalidate: () => [`/${locale}/practice/puzzle/${positionId}`],
  });
}

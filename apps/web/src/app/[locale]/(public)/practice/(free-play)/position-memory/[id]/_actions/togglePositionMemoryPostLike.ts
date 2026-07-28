'use server';

import { getPositionById } from '@/lib/positions/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

export async function togglePositionMemoryPostLike(
  postId: string,
  locale: string,
  positionId: string
) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: positionId,
    topicType: 'position_memory',
    validateTopic: async (id) => (await getPositionById({ id, type: 'memory' })) !== null,
  });
}

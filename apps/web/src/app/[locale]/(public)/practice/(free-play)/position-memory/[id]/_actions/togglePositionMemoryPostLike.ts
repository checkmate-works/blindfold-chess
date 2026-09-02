'use server';

import { POSITION_MEMORY_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
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
    ...POSITION_MEMORY_TOPIC,
  });
}

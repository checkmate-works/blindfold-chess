'use server';

import { PUZZLE_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
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
    ...PUZZLE_TOPIC,
  });
}

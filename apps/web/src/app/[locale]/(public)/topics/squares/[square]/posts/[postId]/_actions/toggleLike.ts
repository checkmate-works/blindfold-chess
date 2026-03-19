'use server';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

import { isValidSquare } from '../../../../_lib/squares';

export type { ToggleLikeResult } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

export async function toggleLike(postId: string, locale: string, square: string) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: square,
    topicType: 'square',
    urlSegment: 'squares',
    validateTopic: isValidSquare,
  });
}

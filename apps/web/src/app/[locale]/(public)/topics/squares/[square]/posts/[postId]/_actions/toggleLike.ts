'use server';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

import { SQUARE_TOPIC } from '../../../../_lib/wrapper-config';

export async function toggleLike(postId: string, locale: string, square: string) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: square,
    ...SQUARE_TOPIC,
  });
}

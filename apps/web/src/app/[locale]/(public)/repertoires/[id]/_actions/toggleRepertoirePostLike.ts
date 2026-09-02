'use server';

import { REPERTOIRE_TOPIC } from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
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
    ...REPERTOIRE_TOPIC,
  });
}

'use server';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';
import { OPENING_TOPIC } from '@/app/[locale]/(public)/topics/openings/_lib/wrapper-config';

export async function toggleLike(postId: string, locale: string, slug: string) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: slug,
    ...OPENING_TOPIC,
  });
}

'use server';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';
import { isValidOpening } from '@/app/[locale]/(public)/topics/openings/_lib/queries';

export async function toggleLike(postId: string, locale: string, slug: string) {
  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: slug,
    topicType: 'opening',
    urlSegment: 'openings',
    validateTopic: isValidOpening,
  });
}

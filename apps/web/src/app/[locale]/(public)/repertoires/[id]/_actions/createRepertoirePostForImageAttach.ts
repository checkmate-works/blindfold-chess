'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Create-post entry point for the repertoire topic's 2-step image flow.
 * Mirrors `createRepertoirePostWithAttachment`'s topic spec.
 */
export async function createRepertoirePostForImageAttach(
  locale: string,
  repertoireId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  const isSpoiler = readSpoilerFlag(formData);

  const repertoire = await getRepertoireById(repertoireId);

  return createPostForImageAttachBase({
    locale,
    topicIdentifier: repertoireId,
    topicType: 'repertoire',
    topicKey: repertoireId,
    urlSegment: 'repertoires',
    validateTopic: () => repertoire !== null,
    invalidTopicError: 'Invalid repertoire',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler,
    topicAuthorId: repertoire?.userId,
    formData,
  });
}

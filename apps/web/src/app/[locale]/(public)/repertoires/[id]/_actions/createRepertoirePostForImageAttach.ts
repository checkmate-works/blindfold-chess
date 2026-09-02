'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import { REPERTOIRE_TOPIC } from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
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
  const repertoire = await getRepertoireById(repertoireId);

  return createPostForImageAttachBase({
    locale,
    topicIdentifier: repertoireId,
    ...REPERTOIRE_TOPIC,
    topicKey: repertoireId,
    // The row is already in hand for `topicAuthorId`, so re-validate against
    // it rather than letting the config's validator issue a second query.
    validateTopic: () => repertoire !== null,
    invalidTopicError: 'Invalid repertoire',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler: readSpoilerFlag(formData),
    topicAuthorId: repertoire?.userId,
    formData,
  });
}

'use server';

import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import { POSITION_MEMORY_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Create-post entry point for the position-memory topic's 2-step image
 * flow. Mirrors `createPositionMemoryPostWithAttachment`'s topic spec.
 */
export async function createPositionMemoryPostForImageAttach(
  locale: string,
  positionId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  const position = await getPositionById({ id: positionId, type: 'memory' });

  return createPostForImageAttachBase({
    locale,
    topicIdentifier: positionId,
    ...POSITION_MEMORY_TOPIC,
    topicKey: positionId,
    // The row is already in hand for `topicAuthorId`, so re-validate against
    // it rather than letting the config's validator issue a second query.
    validateTopic: () => position !== null,
    invalidTopicError: 'Invalid position',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: position?.userId,
    formData,
  });
}

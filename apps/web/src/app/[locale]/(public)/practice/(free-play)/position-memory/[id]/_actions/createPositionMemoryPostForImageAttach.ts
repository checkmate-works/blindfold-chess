'use server';

import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

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
    topicType: 'position_memory',
    topicKey: positionId,
    urlSegment: 'practice/position-memory',
    validateTopic: () => position !== null,
    invalidTopicError: 'Invalid position',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: position?.userId,
    formData,
  });
}

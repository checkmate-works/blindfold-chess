'use server';

import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Create-post entry point for the puzzle topic's 2-step image flow.
 * Mirrors `createPositionPuzzlePostWithAttachment`'s topic spec,
 * including the `isSpoiler` self-flag read.
 */
export async function createPositionPuzzlePostForImageAttach(
  locale: string,
  positionId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  const isSpoiler = readSpoilerFlag(formData);

  const position = await getPositionById({ id: positionId, type: 'puzzle' });

  return createPostForImageAttachBase({
    locale,
    topicIdentifier: positionId,
    topicType: 'position_puzzle',
    topicKey: positionId,
    urlSegment: 'practice/puzzle',
    validateTopic: () => position !== null,
    invalidTopicError: 'Invalid position',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler,
    topicAuthorId: position?.userId,
    formData,
  });
}

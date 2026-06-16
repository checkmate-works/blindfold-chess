'use server';

import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

import { isValidSquare } from '../../../_lib/squares';

/**
 * Create-post entry point for the squares topic's 2-step image flow.
 * Mirrors `createSquarePostWithAttachment`'s topic spec.
 */
export async function createSquarePostForImageAttach(
  locale: string,
  square: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createPostForImageAttachBase({
    locale,
    topicIdentifier: square,
    topicType: 'square',
    topicKey: square,
    urlSegment: 'squares',
    validateTopic: isValidSquare,
    invalidTopicError: 'Invalid square',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    formData,
  });
}

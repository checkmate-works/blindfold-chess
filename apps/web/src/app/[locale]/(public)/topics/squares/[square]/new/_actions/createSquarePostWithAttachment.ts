'use server';

import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';

import { SQUARE_TOPIC } from '../../../_lib/wrapper-config';

/**
 * Thin wrapper around `createPostWithAttachmentBase` for the
 * squares topic. See `createPostWithAttachmentBase` for the full
 * attachment pipeline.
 */
export async function createSquarePostWithAttachment(
  locale: string,
  square: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithAttachmentBase({
    locale,
    topicIdentifier: square,
    ...SQUARE_TOPIC,
    topicKey: square,
    invalidTopicError: 'Invalid square',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    formData,
  });
}

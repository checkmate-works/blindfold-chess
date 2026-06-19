'use server';

import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';

import { SQUARE_TOPIC } from '../../../_lib/wrapper-config';

export async function createSquarePostWithFenAttachment(
  locale: string,
  square: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithFenAttachmentBase({
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

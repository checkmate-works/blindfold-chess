'use server';

import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

import { isValidSquare } from '../../../_lib/squares';

export async function createPost(
  locale: string,
  square: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostBase({
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

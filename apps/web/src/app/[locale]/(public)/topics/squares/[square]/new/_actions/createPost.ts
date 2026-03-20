'use server';

import { RATE_LIMITS } from '@/lib/rate-limit';

import {
  type CreatePostState,
  createPostBase,
} from '@/app/[locale]/(public)/topics/_actions/createPost';

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
    validateContent: (fd) => {
      const content = fd.get('content');

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return { error: 'contentRequired' };
      }

      if (content.length > 5000) {
        return { error: 'contentTooLong' };
      }

      return { content: content.trim() };
    },
    formData,
  });
}

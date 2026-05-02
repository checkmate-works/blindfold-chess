'use server';

import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

export async function createPositionMemoryPost(
  locale: string,
  positionId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const position = await getPositionById({ id: positionId, type: 'memory' });

  return createPostBase({
    locale,
    topicIdentifier: positionId,
    topicType: 'position_memory',
    topicKey: positionId,
    // urlSegment is unused when redirectPath is provided. Pass the
    // segment that `deletePost`'s TOPIC_TYPE_TO_URL_SEGMENT lookup uses
    // for `position_memory` so any code path that derives URLs from this
    // value stays consistent.
    urlSegment: 'practice/position-memory',
    validateTopic: () => position !== null,
    invalidTopicError: 'Invalid position',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: position?.userId,
    redirectPath: (postId) =>
      `/${locale}/practice/position-memory/${positionId}?toast=post_created#post-${postId}`,
    formData,
  });
}

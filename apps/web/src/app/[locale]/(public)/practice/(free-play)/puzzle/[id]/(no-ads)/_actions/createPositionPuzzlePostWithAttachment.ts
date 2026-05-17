'use server';

import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';

export async function createPositionPuzzlePostWithAttachment(
  locale: string,
  positionId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const isSpoiler = readSpoilerFlag(formData);

  const position = await getPositionById({ id: positionId, type: 'puzzle' });

  return createPostWithAttachmentBase({
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
    redirectPath: (postId, { toast }) =>
      `/${locale}/practice/puzzle/${positionId}${
        toast ? '?toast=post_created' : ''
      }#post-${postId}`,
    formData,
  });
}

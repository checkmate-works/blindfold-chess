'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';

export async function createRepertoirePostWithFenAttachment(
  locale: string,
  repertoireId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const isSpoiler = readSpoilerFlag(formData);

  const repertoire = await getRepertoireById(repertoireId);

  return createPostWithFenAttachmentBase({
    locale,
    topicIdentifier: repertoireId,
    topicType: 'repertoire',
    topicKey: repertoireId,
    urlSegment: 'repertoires',
    validateTopic: () => repertoire !== null,
    invalidTopicError: 'Invalid repertoire',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler,
    topicAuthorId: repertoire?.userId,
    redirectPath: (postId) =>
      `/${locale}/repertoires/${repertoireId}?toast=post_created#post-${postId}`,
    formData,
  });
}

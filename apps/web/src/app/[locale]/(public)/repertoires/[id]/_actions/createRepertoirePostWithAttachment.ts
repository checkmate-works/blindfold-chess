'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';

export async function createRepertoirePostWithAttachment(
  locale: string,
  repertoireId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const isSpoiler = readSpoilerFlag(formData);

  const repertoire = await getRepertoireById(repertoireId);

  return createPostWithAttachmentBase({
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
    topicAuthorId: repertoire?.userId ?? undefined,
    redirectPath: (postId, { toast }) =>
      `/${locale}/repertoires/${repertoireId}${toast ? '?toast=post_created' : ''}#post-${postId}`,
    formData,
  });
}

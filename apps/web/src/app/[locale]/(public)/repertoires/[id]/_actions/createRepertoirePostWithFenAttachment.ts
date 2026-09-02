'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import { REPERTOIRE_TOPIC } from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';
import { parentPagePostRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

export async function createRepertoirePostWithFenAttachment(
  locale: string,
  repertoireId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const repertoire = await getRepertoireById(repertoireId);

  return createPostWithFenAttachmentBase({
    locale,
    topicIdentifier: repertoireId,
    ...REPERTOIRE_TOPIC,
    topicKey: repertoireId,
    // The row is already in hand for `topicAuthorId`, so re-validate against
    // it rather than letting the config's validator issue a second query.
    validateTopic: () => repertoire !== null,
    invalidTopicError: 'Invalid repertoire',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler: readSpoilerFlag(formData),
    topicAuthorId: repertoire?.userId,
    redirectPath: parentPagePostRedirect(locale, REPERTOIRE_TOPIC.urlSegment, repertoireId),
    formData,
  });
}

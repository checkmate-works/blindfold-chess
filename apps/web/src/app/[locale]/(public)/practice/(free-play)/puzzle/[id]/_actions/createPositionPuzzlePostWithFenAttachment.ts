'use server';

import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import { PUZZLE_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';
import { parentPagePostRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

export async function createPositionPuzzlePostWithFenAttachment(
  locale: string,
  positionId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const position = await getPositionById({ id: positionId, type: 'puzzle' });

  return createPostWithFenAttachmentBase({
    locale,
    topicIdentifier: positionId,
    ...PUZZLE_TOPIC,
    topicKey: positionId,
    // The row is already in hand for `topicAuthorId`, so re-validate against
    // it rather than letting the config's validator issue a second query.
    validateTopic: () => position !== null,
    invalidTopicError: 'Invalid position',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler: readSpoilerFlag(formData),
    topicAuthorId: position?.userId,
    redirectPath: parentPagePostRedirect(locale, PUZZLE_TOPIC.urlSegment, positionId),
    formData,
  });
}

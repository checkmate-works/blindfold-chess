'use server';

import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

export async function createPositionPuzzlePost(
  locale: string,
  positionId: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  // Self-declared spoiler flag. Empirically the form posts the checkbox as
  // either 'on' (default for `<input type="checkbox" name="...">`) or 'true';
  // accept both and treat anything else as `false` so a missing/forged value
  // never silently flags a comment as containing a solution.
  const rawSpoiler = formData.get('isSpoiler');
  const isSpoiler = rawSpoiler === 'on' || rawSpoiler === 'true';

  const position = await getPositionById({ id: positionId, type: 'puzzle' });

  return createPostBase({
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
    redirectPath: (postId) =>
      `/${locale}/practice/puzzle/${positionId}?toast=post_created#post-${postId}`,
    formData,
  });
}

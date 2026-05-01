'use server';

import { getPositionById } from '@/lib/positions/queries';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

export async function createReply(
  locale: string,
  positionId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  // Self-declared spoiler flag. Same `'on'` / `'true'` normalization as
  // `createPositionPuzzlePost` so a missing or forged value never silently
  // flags a reply as containing the solution.
  const rawSpoiler = formData.get('isSpoiler');
  const isSpoiler = rawSpoiler === 'on' || rawSpoiler === 'true';

  return createReplyBase({
    locale,
    topicIdentifier: positionId,
    postId,
    topicType: 'position_puzzle',
    topicKey: positionId,
    urlSegment: 'practice/puzzle',
    validateTopic: async (id) => (await getPositionById({ id, type: 'puzzle' })) !== null,
    redirectPath: (_postId, replyId) =>
      `/${locale}/practice/puzzle/${positionId}?toast=post_created#post-${replyId}`,
    revalidate: () => `/${locale}/practice/puzzle/${positionId}`,
    isSpoiler,
    formData,
  });
}

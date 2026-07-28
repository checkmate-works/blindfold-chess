'use server';

import { getPositionById } from '@/lib/positions/queries';
import { readSpoilerFlag } from '@/lib/spoiler-flag';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

export async function createReply(
  locale: string,
  positionId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  const isSpoiler = readSpoilerFlag(formData);

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
    isSpoiler,
    formData,
  });
}

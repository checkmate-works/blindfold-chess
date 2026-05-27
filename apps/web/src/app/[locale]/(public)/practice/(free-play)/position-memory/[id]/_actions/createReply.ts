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
  return createReplyBase({
    locale,
    topicIdentifier: positionId,
    postId,
    topicType: 'position_memory',
    topicKey: positionId,
    urlSegment: 'practice/position-memory',
    validateTopic: async (id) => (await getPositionById({ id, type: 'memory' })) !== null,
    redirectPath: (_postId, replyId) =>
      `/${locale}/practice/position-memory/${positionId}?toast=post_created#post-${replyId}`,
    revalidate: () => `/${locale}/practice/position-memory/${positionId}`,
    formData,
  });
}

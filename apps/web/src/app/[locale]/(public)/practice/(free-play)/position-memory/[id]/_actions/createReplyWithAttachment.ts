'use server';

import { getPositionById } from '@/lib/positions/queries';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';

/**
 * Thin wrapper around `createReplyWithAttachmentBase` for the
 * position-memory inline reply surface (#84 phase D).
 */
export async function createReplyWithAttachment(
  locale: string,
  positionId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithAttachmentBase({
    locale,
    topicIdentifier: positionId,
    postId,
    topicType: 'position_memory',
    topicKey: positionId,
    urlSegment: 'practice/position-memory',
    validateTopic: async (id) => (await getPositionById({ id, type: 'memory' })) !== null,
    redirectPath: (_postId, replyId) =>
      `/${locale}/practice/position-memory/${positionId}?toast=post_created#post-${replyId}`,
    formData,
  });
}

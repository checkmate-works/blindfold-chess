'use server';

import { getPositionById } from '@/lib/positions/queries';
import { readSpoilerFlag } from '@/lib/spoiler-flag';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

/**
 * Thin wrapper around `createReplyWithFenAttachmentBase` for the puzzle
 * inline reply surface (#84 phase D). Mirrors the plain `createReply`
 * shape — including the `isSpoiler` FormData read so a FEN-bearing
 * reply can still self-flag as containing the solution.
 */
export async function createReplyWithFenAttachment(
  locale: string,
  positionId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  const isSpoiler = readSpoilerFlag(formData);

  return createReplyWithFenAttachmentBase({
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

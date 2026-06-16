'use server';

import { getPositionById } from '@/lib/positions/queries';
import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Reply image-attach entry point for the puzzle inline reply surface,
 * including the `isSpoiler` self-flag read.
 */
export async function createReplyForImageAttach(
  locale: string,
  positionId: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  const isSpoiler = readSpoilerFlag(formData);

  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: positionId,
    postId,
    topicType: 'position_puzzle',
    topicKey: positionId,
    urlSegment: 'practice/puzzle',
    validateTopic: async (id) => (await getPositionById({ id, type: 'puzzle' })) !== null,
    revalidate: () => `/${locale}/practice/puzzle/${positionId}`,
    isSpoiler,
    formData,
  });
}

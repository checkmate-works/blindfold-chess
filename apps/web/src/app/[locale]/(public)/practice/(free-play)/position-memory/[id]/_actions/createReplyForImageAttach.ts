'use server';

import { getPositionById } from '@/lib/positions/queries';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/** Reply image-attach entry point for the position-memory inline reply surface. */
export async function createReplyForImageAttach(
  locale: string,
  positionId: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: positionId,
    postId,
    topicType: 'position_memory',
    topicKey: positionId,
    urlSegment: 'practice/position-memory',
    validateTopic: async (id) => (await getPositionById({ id, type: 'memory' })) !== null,
    formData,
  });
}

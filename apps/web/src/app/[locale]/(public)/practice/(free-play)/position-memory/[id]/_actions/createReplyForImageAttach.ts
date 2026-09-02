'use server';

import { POSITION_MEMORY_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
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
    ...POSITION_MEMORY_TOPIC,
    topicKey: positionId,
    formData,
  });
}

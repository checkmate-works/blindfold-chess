'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';

import { SQUARE_TOPIC } from '../../../../_lib/wrapper-config';

/**
 * Thin wrapper around `createReplyWithAttachmentBase` for the squares
 * post-detail-page inline reply surface (#84 phase D).
 */
export async function createReplyWithAttachment(
  locale: string,
  square: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithAttachmentBase({
    locale,
    topicIdentifier: square,
    postId,
    ...SQUARE_TOPIC,
    topicKey: square,
    formData,
  });
}

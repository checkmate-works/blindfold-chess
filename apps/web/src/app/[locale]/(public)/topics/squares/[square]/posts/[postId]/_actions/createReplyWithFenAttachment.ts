'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

import { SQUARE_TOPIC } from '../../../../_lib/wrapper-config';

/**
 * Thin wrapper around `createReplyWithFenAttachmentBase` for the squares
 * post-detail-page inline reply surface (#84 phase D).
 */
export async function createReplyWithFenAttachment(
  locale: string,
  square: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithFenAttachmentBase({
    locale,
    topicIdentifier: square,
    postId,
    ...SQUARE_TOPIC,
    topicKey: square,
    formData,
  });
}

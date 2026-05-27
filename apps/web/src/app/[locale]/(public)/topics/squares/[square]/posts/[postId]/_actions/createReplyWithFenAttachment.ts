'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

import { isValidSquare } from '../../../../_lib/squares';

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
    topicType: 'square',
    topicKey: square,
    urlSegment: 'squares',
    validateTopic: isValidSquare,
    formData,
  });
}

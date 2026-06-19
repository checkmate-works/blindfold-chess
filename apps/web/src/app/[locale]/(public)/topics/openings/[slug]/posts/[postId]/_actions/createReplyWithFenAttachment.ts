'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';
import { OPENING_TOPIC } from '@/app/[locale]/(public)/topics/openings/_lib/wrapper-config';

/**
 * Thin wrapper around `createReplyWithFenAttachmentBase` for the
 * openings post-detail-page inline reply surface (#84 phase D).
 */
export async function createReplyWithFenAttachment(
  locale: string,
  slug: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithFenAttachmentBase({
    locale,
    topicIdentifier: slug,
    postId,
    ...OPENING_TOPIC,
    topicKey: slug,
    formData,
  });
}

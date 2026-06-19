'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';
import { OPENING_TOPIC } from '@/app/[locale]/(public)/topics/openings/_lib/wrapper-config';

/**
 * Thin wrapper around `createReplyWithAttachmentBase` for the openings
 * post-detail-page inline reply surface (#84 phase D).
 */
export async function createReplyWithAttachment(
  locale: string,
  slug: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithAttachmentBase({
    locale,
    topicIdentifier: slug,
    postId,
    ...OPENING_TOPIC,
    topicKey: slug,
    formData,
  });
}

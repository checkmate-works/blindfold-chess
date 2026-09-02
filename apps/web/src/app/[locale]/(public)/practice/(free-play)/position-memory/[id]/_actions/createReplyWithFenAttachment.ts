'use server';

import { POSITION_MEMORY_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';
import { parentPageReplyRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-reply-redirect';

/**
 * Thin wrapper around `createReplyWithFenAttachmentBase` for the
 * position-memory inline reply surface.
 */
export async function createReplyWithFenAttachment(
  locale: string,
  positionId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithFenAttachmentBase({
    locale,
    topicIdentifier: positionId,
    postId,
    ...POSITION_MEMORY_TOPIC,
    topicKey: positionId,
    redirectPath: parentPageReplyRedirect(locale, POSITION_MEMORY_TOPIC.urlSegment, positionId),
    formData,
  });
}

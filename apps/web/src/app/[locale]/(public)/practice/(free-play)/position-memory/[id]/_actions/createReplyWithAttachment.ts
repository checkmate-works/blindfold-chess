'use server';

import { POSITION_MEMORY_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';
import { parentPageReplyRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

/**
 * Thin wrapper around `createReplyWithAttachmentBase` for the position-memory
 * inline reply surface.
 */
export async function createReplyWithAttachment(
  locale: string,
  positionId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithAttachmentBase({
    locale,
    topicIdentifier: positionId,
    postId,
    ...POSITION_MEMORY_TOPIC,
    topicKey: positionId,
    redirectPath: parentPageReplyRedirect(locale, POSITION_MEMORY_TOPIC.urlSegment, positionId),
    formData,
  });
}

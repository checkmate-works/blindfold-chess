'use server';

import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { PUZZLE_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';
import { parentPageReplyRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-reply-redirect';

/**
 * Thin wrapper around `createReplyWithAttachmentBase` for the puzzle inline
 * reply surface. Mirrors the plain `createReply` shape — including the
 * `isSpoiler` FormData read so an attachment-bearing reply can still
 * self-flag as containing the solution.
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
    ...PUZZLE_TOPIC,
    topicKey: positionId,
    redirectPath: parentPageReplyRedirect(locale, PUZZLE_TOPIC.urlSegment, positionId),
    isSpoiler: readSpoilerFlag(formData),
    formData,
  });
}

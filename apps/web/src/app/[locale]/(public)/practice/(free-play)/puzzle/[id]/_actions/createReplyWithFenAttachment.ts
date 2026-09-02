'use server';

import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { PUZZLE_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';
import { parentPageReplyRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

/**
 * Thin wrapper around `createReplyWithFenAttachmentBase` for the puzzle inline
 * reply surface. Mirrors the plain `createReply` shape — including the
 * `isSpoiler` FormData read so a FEN-bearing reply can still self-flag as
 * containing the solution.
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
    ...PUZZLE_TOPIC,
    topicKey: positionId,
    redirectPath: parentPageReplyRedirect(locale, PUZZLE_TOPIC.urlSegment, positionId),
    isSpoiler: readSpoilerFlag(formData),
    formData,
  });
}

'use server';

import { buildChunkCommentHref } from '@/app/[locale]/(public)/chunks/_lib/chunk-paths';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

import { CHUNK_TOPIC } from '../../_lib/wrapper-config';

/**
 * Thin wrapper around `createReplyWithFenAttachmentBase` for the chunks
 * list-page inline reply surface (#84 phase D). Mirrors the plain
 * `createChunkReply` shape — the only difference is the FEN attachment
 * INSERT in `post_fen_attachments` chained inside the base's
 * `afterInsert` hook so the reply + attachment land atomically.
 */
export async function createChunkReplyWithFenAttachment(
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
    ...CHUNK_TOPIC,
    topicKey: slug,
    redirectPath: (_parentPostId, replyId) =>
      buildChunkCommentHref(slug, replyId, { locale, toast: 'post_created' }),
    formData,
  });
}

'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

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
    topicType: 'chunk',
    topicKey: slug,
    urlSegment: 'chunks',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
    redirectPath: (_parentPostId, replyId) =>
      `/${locale}/chunks/${slug}?toast=post_created#post-${replyId}`,
    formData,
  });
}

'use server';

import { buildChunkCommentHref } from '@/app/[locale]/(public)/chunks/_lib/chunk-paths';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';

import { CHUNK_TOPIC } from '../../_lib/wrapper-config';

/**
 * Thin wrapper around `createReplyWithAttachmentBase` for the chunks
 * list-page inline reply surface (#84 phase D). Mirrors the plain
 * `createChunkReply` shape — the only differences are the base it
 * delegates to and the per-attachment rate limit charged inside the
 * base when an `attachment` field is present.
 */
export async function createChunkReplyWithAttachment(
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
    ...CHUNK_TOPIC,
    topicKey: slug,
    redirectPath: (_parentPostId, replyId) =>
      buildChunkCommentHref(slug, replyId, { locale, toast: 'post_created' }),
    formData,
  });
}

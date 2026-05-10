'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';

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
    topicType: 'chunk',
    topicKey: slug,
    urlSegment: 'chunks',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
    redirectPath: (_parentPostId, replyId) =>
      `/${locale}/chunks/${slug}?toast=post_created#post-${replyId}`,
    revalidate: () => `/${locale}/chunks/${slug}`,
    formData,
  });
}

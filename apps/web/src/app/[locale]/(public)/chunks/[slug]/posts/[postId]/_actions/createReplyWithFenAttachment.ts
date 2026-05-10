'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

/**
 * Thin wrapper around `createReplyWithFenAttachmentBase` for the chunks
 * post-detail-page inline reply surface (#84 phase D).
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
    topicType: 'chunk',
    topicKey: slug,
    urlSegment: 'chunks',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
    redirectPath: (parentPostId) =>
      `/${locale}/chunks/${slug}/posts/${parentPostId}?toast=post_created`,
    revalidate: (parentPostId) => `/${locale}/chunks/${slug}/posts/${parentPostId}`,
    formData,
  });
}

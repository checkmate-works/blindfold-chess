'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';

/**
 * Thin wrapper around `createReplyWithAttachmentBase` for the chunks
 * post-detail-page inline reply surface (#84 phase D). Mirrors the
 * plain `createReply` shape — the redirect lands on the post detail
 * page (not the chunks list) so the new reply is rendered in the same
 * thread the user just submitted into.
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

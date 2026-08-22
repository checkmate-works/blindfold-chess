'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';

/**
 * Thin wrapper around `createPostWithFenAttachmentBase` (#84 step 2).
 *
 * FEN validation / sanitisation / post_fen_attachments INSERT /
 * SQLSTATE mapping are all handled by the shared base. This wrapper
 * only contributes the chunks-specific topic spec.
 */
export async function createChunkPostWithFenAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const chunk = await getChunkBySlug(slug);

  return createPostWithFenAttachmentBase({
    locale,
    topicIdentifier: slug,
    topicType: 'chunk',
    topicKey: slug,
    urlSegment: 'chunks',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
    invalidTopicError: 'Invalid chunk',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: chunk?.userId,
    redirectPath: (postId) => `/${locale}/chunks/${slug}?toast=post_created#post-${postId}`,
    formData,
  });
}

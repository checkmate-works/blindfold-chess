'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';

/**
 * Thin wrapper around `createPostWithAttachmentBase` (#84 step 2).
 *
 * The PGN parsing / Lichess auto-fetch / chess-core validation /
 * post_game_pgn_attachments INSERT are all handled by the shared
 * base. This wrapper only contributes the chunks-specific topic
 * spec and the FormData.
 */
export async function createChunkPostWithAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const chunk = await getChunkBySlug(slug);

  return createPostWithAttachmentBase({
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

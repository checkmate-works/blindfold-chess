'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Create-post entry point for the chunk topic's 2-step image flow.
 *
 * Mirrors `createChunkPostWithAttachment`'s topic spec (no feed item;
 * chunk comments are reply-equivalent) but returns the new post id so
 * the client can POST each selected image to `/api/posts/[id]/images`.
 */
export async function createChunkPostForImageAttach(
  locale: string,
  slug: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createPostForImageAttachBase({
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
    formData,
  });
}

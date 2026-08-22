'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

export async function createChunkPost(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  // getChunkBySlug is React.cache-wrapped, so this fetch and validateTopic
  // share one query. userId may be null (orphaned author) — the notification
  // no-ops in that case.
  const chunk = await getChunkBySlug(slug);

  return createPostBase({
    locale,
    topicIdentifier: slug,
    topicType: 'chunk',
    topicKey: slug,
    // urlSegment is unused when redirectPath is provided, but we still pass a
    // sensible value so the deletePost / activity-log paths that derive their
    // URL from `chunk → 'chunks'` stay consistent across the codebase.
    urlSegment: 'chunks',
    validateTopic: () => chunk !== null,
    invalidTopicError: 'Invalid chunk',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: chunk?.userId,
    redirectPath: (postId) => `/${locale}/chunks/${slug}?toast=post_created#post-${postId}`,
    formData,
  });
}

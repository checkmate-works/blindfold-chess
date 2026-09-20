'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import { buildChunkCommentHref } from '@/app/[locale]/(public)/chunks/_lib/chunk-paths';
import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

import { CHUNK_TOPIC } from '../../_lib/wrapper-config';

export async function createChunkPost(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  // Read only for `topicAuthorId`; the existence check is `CHUNK_TOPIC`'s.
  // userId may be null (orphaned author) — the notification no-ops then.
  const chunk = await getChunkBySlug(slug);

  return createPostBase({
    locale,
    topicIdentifier: slug,
    ...CHUNK_TOPIC,
    topicKey: slug,
    invalidTopicError: 'Invalid chunk',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: chunk?.userId,
    redirectPath: (postId) =>
      buildChunkCommentHref(slug, postId, { locale, toast: 'post_created' }),
    formData,
  });
}

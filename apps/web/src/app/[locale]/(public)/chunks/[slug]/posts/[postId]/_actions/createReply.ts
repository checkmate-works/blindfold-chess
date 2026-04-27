'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

export async function createReply(
  locale: string,
  slug: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyBase({
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

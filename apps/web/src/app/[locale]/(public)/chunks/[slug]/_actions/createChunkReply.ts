'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import { buildChunkCommentHref } from '@/app/[locale]/(public)/chunks/_lib/chunk-paths';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

export async function createChunkReply(
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
    redirectPath: (_parentPostId, replyId) =>
      buildChunkCommentHref(slug, replyId, { locale, toast: 'post_created' }),
    formData,
  });
}

'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/** Reply image-attach entry point for the chunks inline reply surface. */
export async function createReplyForImageAttach(
  locale: string,
  slug: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: slug,
    postId,
    topicType: 'chunk',
    topicKey: slug,
    urlSegment: 'chunks',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
    revalidate: (parentPostId) => `/${locale}/chunks/${slug}/posts/${parentPostId}`,
    formData,
  });
}

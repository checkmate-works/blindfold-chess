'use server';

import { buildChunkCommentHref } from '@/app/[locale]/(public)/chunks/_lib/chunk-paths';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

import { CHUNK_TOPIC } from '../../_lib/wrapper-config';

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
    ...CHUNK_TOPIC,
    topicKey: slug,
    redirectPath: (_parentPostId, replyId) =>
      buildChunkCommentHref(slug, replyId, { locale, toast: 'post_created' }),
    formData,
  });
}

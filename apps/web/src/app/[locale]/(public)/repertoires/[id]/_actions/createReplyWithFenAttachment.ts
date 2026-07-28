'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { readSpoilerFlag } from '@/lib/spoiler-flag';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

/** Thin wrapper around `createReplyWithFenAttachmentBase` for repertoire comments. */
export async function createReplyWithFenAttachment(
  locale: string,
  repertoireId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  const isSpoiler = readSpoilerFlag(formData);

  return createReplyWithFenAttachmentBase({
    locale,
    topicIdentifier: repertoireId,
    postId,
    topicType: 'repertoire',
    topicKey: repertoireId,
    urlSegment: 'repertoires',
    validateTopic: async (id) => (await getRepertoireById(id)) !== null,
    redirectPath: (_postId, replyId) =>
      `/${locale}/repertoires/${repertoireId}?toast=post_created#post-${replyId}`,
    isSpoiler,
    formData,
  });
}

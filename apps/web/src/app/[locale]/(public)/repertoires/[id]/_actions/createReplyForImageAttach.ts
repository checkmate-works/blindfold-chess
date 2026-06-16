'use server';

import { getRepertoireById } from '@/lib/repertoires/queries';
import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/** Reply image-attach entry point for the repertoire comment surface. */
export async function createReplyForImageAttach(
  locale: string,
  repertoireId: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  const isSpoiler = readSpoilerFlag(formData);

  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: repertoireId,
    postId,
    topicType: 'repertoire',
    topicKey: repertoireId,
    urlSegment: 'repertoires',
    validateTopic: async (id) => (await getRepertoireById(id)) !== null,
    revalidate: () => `/${locale}/repertoires/${repertoireId}`,
    isSpoiler,
    formData,
  });
}

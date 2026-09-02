'use server';

import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { REPERTOIRE_TOPIC } from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/** Reply image-attach entry point for the repertoire comment surface. */
export async function createReplyForImageAttach(
  locale: string,
  repertoireId: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: repertoireId,
    postId,
    ...REPERTOIRE_TOPIC,
    topicKey: repertoireId,
    isSpoiler: readSpoilerFlag(formData),
    formData,
  });
}

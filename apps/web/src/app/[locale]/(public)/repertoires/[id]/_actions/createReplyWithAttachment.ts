'use server';

import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { REPERTOIRE_TOPIC } from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';
import { parentPageReplyRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-redirects';

/** Thin wrapper around `createReplyWithAttachmentBase` for repertoire comments. */
export async function createReplyWithAttachment(
  locale: string,
  repertoireId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithAttachmentBase({
    locale,
    topicIdentifier: repertoireId,
    postId,
    ...REPERTOIRE_TOPIC,
    topicKey: repertoireId,
    redirectPath: parentPageReplyRedirect(locale, REPERTOIRE_TOPIC.urlSegment, repertoireId),
    isSpoiler: readSpoilerFlag(formData),
    formData,
  });
}

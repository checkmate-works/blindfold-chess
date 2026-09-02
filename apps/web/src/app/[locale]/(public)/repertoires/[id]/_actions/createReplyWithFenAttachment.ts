'use server';

import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { REPERTOIRE_TOPIC } from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';
import { parentPageReplyRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-reply-redirect';

/** Thin wrapper around `createReplyWithFenAttachmentBase` for repertoire comments. */
export async function createReplyWithFenAttachment(
  locale: string,
  repertoireId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyWithFenAttachmentBase({
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

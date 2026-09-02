'use server';

import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { PUZZLE_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { parentPageReplyRedirect } from '@/app/[locale]/(public)/topics/_lib/parent-page-reply-redirect';

export async function createReply(
  locale: string,
  positionId: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyBase({
    locale,
    topicIdentifier: positionId,
    postId,
    ...PUZZLE_TOPIC,
    topicKey: positionId,
    redirectPath: parentPageReplyRedirect(locale, PUZZLE_TOPIC.urlSegment, positionId),
    isSpoiler: readSpoilerFlag(formData),
    formData,
  });
}

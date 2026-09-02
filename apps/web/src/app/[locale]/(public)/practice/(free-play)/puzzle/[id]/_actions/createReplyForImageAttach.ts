'use server';

import { readSpoilerFlag } from '@/lib/spoiler-flag';

import { PUZZLE_TOPIC } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Reply image-attach entry point for the puzzle inline reply surface,
 * including the `isSpoiler` self-flag read.
 */
export async function createReplyForImageAttach(
  locale: string,
  positionId: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: positionId,
    postId,
    ...PUZZLE_TOPIC,
    topicKey: positionId,
    isSpoiler: readSpoilerFlag(formData),
    formData,
  });
}

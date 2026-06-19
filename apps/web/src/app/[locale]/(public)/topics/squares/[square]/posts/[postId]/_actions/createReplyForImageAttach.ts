'use server';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

import { SQUARE_TOPIC } from '../../../../_lib/wrapper-config';

/** Reply image-attach entry point for the squares inline reply surface. */
export async function createReplyForImageAttach(
  locale: string,
  square: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: square,
    postId,
    ...SQUARE_TOPIC,
    topicKey: square,
    formData,
  });
}

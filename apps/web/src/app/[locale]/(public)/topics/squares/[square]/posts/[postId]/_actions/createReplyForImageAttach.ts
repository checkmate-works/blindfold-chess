'use server';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

import { isValidSquare } from '../../../../_lib/squares';

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
    topicType: 'square',
    topicKey: square,
    urlSegment: 'squares',
    validateTopic: isValidSquare,
    formData,
  });
}

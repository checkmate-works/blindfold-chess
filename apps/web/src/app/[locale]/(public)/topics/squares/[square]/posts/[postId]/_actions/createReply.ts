'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyBase } from '@/app/[locale]/(public)/topics/_actions/createReply';

import { SQUARE_TOPIC } from '../../../../_lib/wrapper-config';

export async function createReply(
  locale: string,
  square: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  return createReplyBase({
    locale,
    topicIdentifier: square,
    postId,
    ...SQUARE_TOPIC,
    topicKey: square,
    formData,
  });
}

'use server';

import {
  type CreateReplyState,
  createReplyBase,
} from '@/app/[locale]/(public)/topics/_actions/createReply';

import { isValidSquare } from '../../../../_lib/squares';

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
    topicType: 'square',
    topicKey: square,
    urlSegment: 'squares',
    validateTopic: isValidSquare,
    formData,
  });
}

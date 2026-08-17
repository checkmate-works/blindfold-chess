'use server';

import type { DbTx } from '@/lib/db/types';
import {
  fenAttachmentInsertErrorKey,
  resolveFenAttachment,
} from '@/lib/topic-posts/attachment-steps';

import type { TopicType } from '@/app/[locale]/(public)/topics/_lib/constants';

import type { CreateReplyState } from './createReply';
import { createReplyBase } from './createReply';

/**
 * @design Shared FEN-attachment-aware reply Server Action body (#84 phase D)
 *
 * Mirrors `createPostWithFenAttachmentBase` for the reply (comment)
 * surface — the validation contract is identical, only the underlying
 * base call (`createReplyBase` vs `createPostBase`) differs. Both share
 * the FEN validation pipeline and INSERT-time SQLSTATE mapping via
 * `buildFenAttachmentValues` / `fenAttachmentErrorKey` /
 * `fenAttachmentPgErrorKind`.
 */

type ExtraAfterInsert = (tx: DbTx, replyId: string) => Promise<void>;

export async function createReplyWithFenAttachmentBase(args: {
  locale: string;
  topicIdentifier: string;
  postId: string;
  topicType: TopicType;
  topicKey: string;
  urlSegment: string;
  validateTopic: (identifier: string) => boolean | Promise<boolean>;
  redirectPath?: (postId: string, replyId: string) => string;
  isSpoiler?: boolean;
  /** Topic-specific extra rows to insert inside the same transaction. */
  extraAfterInsert?: ExtraAfterInsert;
  formData: FormData;
}): Promise<CreateReplyState> {
  const { formData, extraAfterInsert, ...replySpec } = args;

  const attachment = resolveFenAttachment(formData);
  if (attachment.kind === 'error') {
    return { error: attachment.error };
  }

  try {
    return await createReplyBase({
      ...replySpec,
      afterInsert: attachment.afterInsert(extraAfterInsert),
      formData,
    });
  } catch (err) {
    const error = fenAttachmentInsertErrorKey(err);
    if (error) {
      return { error };
    }
    throw err;
  }
}

'use server';

import { postFenAttachments } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import {
  buildFenAttachmentValues,
  fenAttachmentErrorKey,
  fenAttachmentPgErrorKind,
} from '@/lib/post-fens/build-fen-attachment-values';

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

  const built = buildFenAttachmentValues(
    formData.get('attachmentFen'),
    formData.get('attachmentFenCaption')
  );
  if (!built.ok) {
    return { error: fenAttachmentErrorKey(built.error) };
  }
  const { fen, caption } = built.values;

  try {
    return await createReplyBase({
      ...replySpec,
      afterInsert: async (tx, replyId) => {
        await tx.insert(postFenAttachments).values({
          postId: replyId,
          fen,
          caption,
        });
        if (extraAfterInsert) {
          await extraAfterInsert(tx, replyId);
        }
      },
      formData,
    });
  } catch (err) {
    const kind = fenAttachmentPgErrorKind(err);
    if (kind) {
      return { error: fenAttachmentErrorKey(kind) };
    }
    throw err;
  }
}

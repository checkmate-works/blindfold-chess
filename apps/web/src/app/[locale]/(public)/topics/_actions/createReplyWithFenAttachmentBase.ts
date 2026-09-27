'use server';

import {
  fenAttachmentInsertErrorKey,
  resolveFenAttachment,
} from '@/lib/topic-posts/attachment-steps';

import type { WithExtraAfterInsert } from '@/app/[locale]/(public)/topics/_lib/attachment-insert';
import { mapAttachmentInsertError } from '@/app/[locale]/(public)/topics/_lib/attachment-insert';

import type { CreateReplyParams, CreateReplyState } from './createReply';
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

export async function createReplyWithFenAttachmentBase(
  args: WithExtraAfterInsert<CreateReplyParams>
): Promise<CreateReplyState> {
  const { formData, extraAfterInsert, ...replySpec } = args;

  const attachment = resolveFenAttachment(formData);
  if (attachment.kind === 'error') {
    return { error: attachment.error };
  }

  return mapAttachmentInsertError(
    () =>
      createReplyBase({
        ...replySpec,
        afterInsert: attachment.afterInsert(extraAfterInsert),
        formData,
      }),
    fenAttachmentInsertErrorKey
  );
}

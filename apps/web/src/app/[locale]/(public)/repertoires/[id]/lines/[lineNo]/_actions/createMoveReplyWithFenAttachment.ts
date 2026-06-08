'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

import { buildMoveReplyConfig } from '../_lib/move-comment-config';

/** Reply to a per-move comment (topicType 'repertoire_move'), FEN attachment. */
export async function createMoveReplyWithFenAttachment(
  locale: string,
  topicKey: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  const config = await buildMoveReplyConfig({ locale, topicKey, postId, formData });
  if ('error' in config) return config;
  return createReplyWithFenAttachmentBase(config);
}

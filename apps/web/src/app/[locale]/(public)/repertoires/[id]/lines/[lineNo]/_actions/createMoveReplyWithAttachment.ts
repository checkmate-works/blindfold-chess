'use server';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithAttachmentBase';

import { buildMoveReplyConfig } from '../_lib/move-comment-config';

/** Reply to a per-move comment (topicType 'repertoire_move'), PGN attachment. */
export async function createMoveReplyWithAttachment(
  locale: string,
  topicKey: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  const config = await buildMoveReplyConfig({ locale, topicKey, postId, formData });
  if ('error' in config) return config;
  return createReplyWithAttachmentBase(config);
}

'use server';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

import { buildMoveReplyConfig } from '../_lib/move-comment-config';

/**
 * Reply image-attach entry point for a per-move comment
 * (topicType 'repertoire_move'). Reuses `buildMoveReplyConfig`.
 */
export async function createMoveReplyForImageAttach(
  locale: string,
  topicKey: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  const config = await buildMoveReplyConfig({ locale, topicKey, postId, formData });
  if ('error' in config) return { ok: false, error: config.error ?? 'Invalid move' };
  return createReplyForImageAttachBase(config);
}

'use server';

import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

import { buildMovePostConfig } from '../_lib/move-comment-config';

/**
 * Create-post entry point for a per-move comment's 2-step image flow
 * (topicType 'repertoire_move'). Reuses `buildMovePostConfig` — the
 * same topic spec the PGN/FEN move actions use.
 */
export async function createMovePostForImageAttach(
  locale: string,
  topicKey: string,
  lineNo: number,
  ply: number,
  formData: FormData
): Promise<ImageAttachResult> {
  const config = await buildMovePostConfig({ locale, topicKey, lineNo, ply, formData });
  if ('error' in config) return { ok: false, error: config.error ?? 'Invalid move' };
  return createPostForImageAttachBase(config);
}

'use server';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';

import { buildMovePostConfig } from '../_lib/move-comment-config';

/** Top-level comment on a move (topicType 'repertoire_move'), FEN attachment. */
export async function createMovePostWithFenAttachment(
  locale: string,
  topicKey: string,
  lineNo: number,
  ply: number,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const config = await buildMovePostConfig({ locale, topicKey, lineNo, ply, formData });
  if ('error' in config) return config;
  return createPostWithFenAttachmentBase(config);
}

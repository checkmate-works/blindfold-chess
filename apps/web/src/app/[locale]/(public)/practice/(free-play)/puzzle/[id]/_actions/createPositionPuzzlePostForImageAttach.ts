'use server';

import { getPositionPuzzlePostParams } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Create-post entry point for the puzzle topic's 2-step image flow.
 * Mirrors `createPositionPuzzlePostWithAttachment`'s topic spec,
 * including the `isSpoiler` self-flag read.
 */
export async function createPositionPuzzlePostForImageAttach(
  locale: string,
  positionId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createPostForImageAttachBase(
    await getPositionPuzzlePostParams(locale, positionId, formData)
  );
}

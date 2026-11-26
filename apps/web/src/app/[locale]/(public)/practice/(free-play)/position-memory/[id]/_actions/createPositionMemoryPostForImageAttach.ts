'use server';

import { getPositionMemoryPostParams } from '@/app/[locale]/(public)/practice/(free-play)/_lib/wrapper-config';
import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Create-post entry point for the position-memory topic's 2-step image
 * flow. Mirrors `createPositionMemoryPostWithAttachment`'s topic spec.
 */
export async function createPositionMemoryPostForImageAttach(
  locale: string,
  positionId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createPostForImageAttachBase(
    await getPositionMemoryPostParams(locale, positionId, formData)
  );
}

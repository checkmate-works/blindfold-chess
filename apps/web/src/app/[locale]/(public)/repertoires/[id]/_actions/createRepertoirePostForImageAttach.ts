'use server';

import { getRepertoirePostParams } from '@/app/[locale]/(public)/repertoires/_lib/wrapper-config';
import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';

/**
 * Create-post entry point for the repertoire topic's 2-step image flow.
 * Mirrors `createRepertoirePostWithAttachment`'s topic spec.
 */
export async function createRepertoirePostForImageAttach(
  locale: string,
  repertoireId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createPostForImageAttachBase(
    await getRepertoirePostParams(locale, repertoireId, formData)
  );
}

'use server';

import { createReplyForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createReply';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';
import { isValidOpening } from '@/app/[locale]/(public)/topics/openings/_lib/queries';

/** Reply image-attach entry point for the openings inline reply surface. */
export async function createReplyForImageAttach(
  locale: string,
  slug: string,
  postId: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createReplyForImageAttachBase({
    locale,
    topicIdentifier: slug,
    postId,
    topicType: 'opening',
    topicKey: slug,
    urlSegment: 'openings',
    validateTopic: isValidOpening,
    formData,
  });
}

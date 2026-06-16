'use server';

import { createOpeningPostRateLimit } from '@/lib/security/rate-limit';

import { createPostForImageAttachBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import type { ImageAttachResult } from '@/app/[locale]/(public)/topics/_lib/image-attach-types';
import {
  insertOpeningPostRatings,
  validateOpeningPostContent,
} from '@/app/[locale]/(public)/topics/openings/_lib/opening-post-input';
import { isValidOpening } from '@/app/[locale]/(public)/topics/openings/_lib/queries';

/**
 * Create-post entry point for the opening topic's 2-step image flow.
 * Mirrors `createOpeningPostWithAttachment`'s topic spec (including the
 * opening-rating `afterInsert`) but returns the new post id so the
 * client can upload the selected images.
 */
export async function createOpeningPostForImageAttach(
  locale: string,
  slug: string,
  formData: FormData
): Promise<ImageAttachResult> {
  return createPostForImageAttachBase({
    locale,
    topicIdentifier: slug,
    topicType: 'opening',
    topicKey: slug,
    urlSegment: 'openings',
    validateTopic: isValidOpening,
    invalidTopicError: 'invalidOpening',
    rateLimit: createOpeningPostRateLimit(slug),
    validateContent: (fd) => validateOpeningPostContent(fd, 'attachment'),
    afterInsert: (tx, postId) => insertOpeningPostRatings(tx, postId, formData),
    formData,
  });
}

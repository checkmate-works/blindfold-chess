'use server';

import { createOpeningPostRateLimit } from '@/lib/security/rate-limit';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';
import {
  insertOpeningPostRatings,
  validateOpeningPostContent,
} from '@/app/[locale]/(public)/topics/openings/_lib/opening-post-input';
import { isValidOpening } from '@/app/[locale]/(public)/topics/openings/_lib/queries';

export async function createOpeningPostWithAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithAttachmentBase({
    locale,
    topicIdentifier: slug,
    topicType: 'opening',
    topicKey: slug,
    urlSegment: 'openings',
    validateTopic: isValidOpening,
    invalidTopicError: 'invalidOpening',
    rateLimit: createOpeningPostRateLimit(slug),
    validateContent: (fd) => validateOpeningPostContent(fd, 'attachment'),
    extraAfterInsert: (tx, postId) => insertOpeningPostRatings(tx, postId, formData),
    formData,
  });
}

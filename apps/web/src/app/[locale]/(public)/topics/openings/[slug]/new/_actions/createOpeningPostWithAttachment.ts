'use server';

import { topicPostRatings } from '@/lib/db';
import { createOpeningPostRateLimit } from '@/lib/security/rate-limit';
import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithAttachmentBase';
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
    validateContent: (fd) => {
      const content = fd.get('content');
      const preferenceRatingRaw = fd.get('preferenceRating');
      const proficiencyRatingRaw = fd.get('proficiencyRating');
      const attachmentRaw = fd.get('attachment');

      const contentStr = typeof content === 'string' ? content.trim() : '';
      const preferenceRating = parseRating(preferenceRatingRaw);
      const proficiencyRating = parseRating(proficiencyRatingRaw);
      const hasAttachment = typeof attachmentRaw === 'string' && attachmentRaw.trim().length > 0;

      const hasContent = contentStr.length > 0;
      const hasRating = preferenceRating !== null || proficiencyRating !== null;

      // Openings allow content-less posts when a rating is provided.
      // With #84 attachment integration, an attachment also satisfies
      // the "something to post" requirement.
      if (!hasContent && !hasRating && !hasAttachment) {
        return { error: 'contentOrRatingRequired' };
      }

      if (contentStr.length > MAX_CONTENT_LENGTH) {
        return { error: 'contentTooLong' };
      }

      return { content: contentStr };
    },
    extraAfterInsert: async (tx, postId) => {
      const preferenceRating = parseRating(formData.get('preferenceRating'));
      const proficiencyRating = parseRating(formData.get('proficiencyRating'));

      if (preferenceRating !== null || proficiencyRating !== null) {
        await tx.insert(topicPostRatings).values({
          postId,
          preferenceRating,
          proficiencyRating,
        });
      }
    },
    formData,
  });
}

function parseRating(value: FormDataEntryValue | null): number | null {
  if (value === null || typeof value !== 'string') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) return null;
  return num;
}

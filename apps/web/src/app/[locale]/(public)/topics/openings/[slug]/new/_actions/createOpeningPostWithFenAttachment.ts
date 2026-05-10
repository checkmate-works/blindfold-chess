'use server';

import { topicPostRatings } from '@/lib/db';
import { createOpeningPostRateLimit } from '@/lib/security/rate-limit';
import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createPostWithFenAttachmentBase';
import { isValidOpening } from '@/app/[locale]/(public)/topics/openings/_lib/queries';

export async function createOpeningPostWithFenAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostWithFenAttachmentBase({
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
      const fenRaw = fd.get('attachmentFen');

      const contentStr = typeof content === 'string' ? content.trim() : '';
      const preferenceRating = parseRating(preferenceRatingRaw);
      const proficiencyRating = parseRating(proficiencyRatingRaw);
      const hasFen = typeof fenRaw === 'string' && fenRaw.trim().length > 0;

      const hasContent = contentStr.length > 0;
      const hasRating = preferenceRating !== null || proficiencyRating !== null;

      if (!hasContent && !hasRating && !hasFen) {
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

'use server';

import { topicPostRatings } from '@/lib/db';
import { createOpeningPostRateLimit } from '@/lib/security/rate-limit';
import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { isValidOpening } from '@/app/[locale]/(public)/topics/openings/_lib/queries';

export async function createOpeningPost(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  return createPostBase({
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

      const contentStr = typeof content === 'string' ? content.trim() : '';
      const preferenceRating = parseRating(preferenceRatingRaw);
      const proficiencyRating = parseRating(proficiencyRatingRaw);

      const hasContent = contentStr.length > 0;
      const hasRating = preferenceRating !== null || proficiencyRating !== null;

      if (!hasContent && !hasRating) {
        return { error: 'contentOrRatingRequired' };
      }

      if (contentStr.length > MAX_CONTENT_LENGTH) {
        return { error: 'contentTooLong' };
      }

      return { content: contentStr };
    },
    afterInsert: async (tx, postId) => {
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

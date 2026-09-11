import { topicPostRatings } from '@/lib/db';
import type { DbTx } from '@/lib/db/types';
import { validateContentValue } from '@/lib/validations/content';

/**
 * Parse a 1-5 preference / proficiency rating from raw FormData input.
 * Returns `null` for a missing, non-numeric, or out-of-range value.
 */
export function parseRating(value: FormDataEntryValue | null): number | null {
  if (value === null || typeof value !== 'string') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) return null;
  return num;
}

/**
 * Content validator shared by the opening new-post actions.
 *
 * Openings allow content-less posts when a rating is provided; with the
 * #84 attachment integration, an attachment also satisfies the "something
 * to post" requirement. `attachmentField` is the FormData key that carries
 * the attachment for the calling flow (`attachment` for PGN, `attachmentFen`
 * for FEN).
 */
export function validateOpeningPostContent(
  formData: FormData,
  attachmentField: string
): { error: string } | { content: string } {
  const attachmentRaw = formData.get(attachmentField);

  // The shared rule reports an empty body as `contentRequired`, but here an
  // empty body is fine when a rating or an attachment stands in for it — so
  // only the length verdict is taken from it, and "something to post" is the
  // combined check below.
  const contentResult = validateContentValue(formData.get('content'));
  if ('error' in contentResult && contentResult.error === 'contentTooLong') {
    return { error: contentResult.error };
  }
  const contentStr = 'content' in contentResult ? contentResult.content : '';

  const preferenceRating = parseRating(formData.get('preferenceRating'));
  const proficiencyRating = parseRating(formData.get('proficiencyRating'));
  const hasAttachment = typeof attachmentRaw === 'string' && attachmentRaw.trim().length > 0;

  const hasContent = contentStr.length > 0;
  const hasRating = preferenceRating !== null || proficiencyRating !== null;

  if (!hasContent && !hasRating && !hasAttachment) {
    return { error: 'contentOrRatingRequired' };
  }

  return { content: contentStr };
}

/**
 * Post-insert hook shared by the opening new-post actions: persists the
 * preference / proficiency rating row when either rating was supplied.
 */
export async function insertOpeningPostRatings(
  tx: DbTx,
  postId: string,
  formData: FormData
): Promise<void> {
  const preferenceRating = parseRating(formData.get('preferenceRating'));
  const proficiencyRating = parseRating(formData.get('proficiencyRating'));

  if (preferenceRating !== null || proficiencyRating !== null) {
    await tx.insert(topicPostRatings).values({
      postId,
      preferenceRating,
      proficiencyRating,
    });
  }
}

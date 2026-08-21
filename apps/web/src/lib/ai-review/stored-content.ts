import type { AiReviewContent } from './types';

/**
 * Bring a `game_ai_reviews.content` row up to the current
 * {@link AiReviewContent} shape.
 *
 * `summary` was a paragraph until 2026-08-22 and is a list of takeaways
 * since. A review is immutable once stored (it is published content, and a
 * regeneration would cost its author their daily slot), so the old rows are
 * read as one-item lists rather than rewritten. The list renders the
 * paragraph as a single bullet, which is the right outcome: the point of the
 * change is the shape of new reviews, not a retouch of old ones.
 */
export function normalizeStoredContent(
  content: Omit<AiReviewContent, 'summary'> & { summary: string | string[] }
): AiReviewContent {
  return {
    ...content,
    summary: Array.isArray(content.summary) ? content.summary : [content.summary],
  };
}

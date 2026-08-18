import type { RatingFaceLevel } from '@blindfold-chess/icons';

/**
 * Face colour per rating level, shared by the read-only display and the input
 * that writes it — the two had byte-identical copies, so a palette change
 * could have left the picker and the result showing different colours for the
 * same rating.
 */
export const RATING_FACE_COLORS: Record<RatingFaceLevel, string> = {
  1: '#7C3AED',
  2: '#60A5FA',
  3: '#F59E0B',
  4: '#EF4444',
  5: '#EC4899',
};

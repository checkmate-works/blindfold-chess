export const OPENING_CATEGORIES = [
  'open',
  'semi-open',
  'closed',
  'indian',
  'flank',
  'other',
] as const;

export type OpeningCategory = (typeof OPENING_CATEGORIES)[number];

/**
 * Classify an ECO code into an opening category.
 *
 * | Category  | ECO range                    | Description                    |
 * |-----------|------------------------------|--------------------------------|
 * | open      | C20-C99                      | 1.e4 e5                        |
 * | semi-open | B00-B99, C00-C19             | 1.e4, not e5                   |
 * | closed    | D00-D69                      | 1.d4 d5                        |
 * | indian    | A45-A79, D70-D99, E00-E99    | 1.d4 Nf6                       |
 * | flank     | A00-A39                      | 1.c4, 1.Nf3, etc.              |
 * | other     | A40-A44, A80-A99, else       |                                |
 */
export function classifyEcoCode(ecoCode: string): OpeningCategory {
  if (ecoCode.length < 2) return 'other';

  const letter = ecoCode[0];
  const num = parseInt(ecoCode.slice(1), 10);

  if (isNaN(num)) return 'other';

  if (letter === 'C' && num >= 20 && num <= 99) return 'open';
  if (letter === 'B' && num >= 0 && num <= 99) return 'semi-open';
  if (letter === 'C' && num >= 0 && num <= 19) return 'semi-open';
  if (letter === 'D' && num >= 0 && num <= 69) return 'closed';
  if (letter === 'A' && num >= 45 && num <= 79) return 'indian';
  if (letter === 'D' && num >= 70 && num <= 99) return 'indian';
  if (letter === 'E' && num >= 0 && num <= 99) return 'indian';
  if (letter === 'A' && num >= 0 && num <= 39) return 'flank';

  return 'other';
}

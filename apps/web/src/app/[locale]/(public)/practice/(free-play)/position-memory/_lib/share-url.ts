import type { Locale } from '@/app/[locale]/_lib/types';

export { validateFenFormat as validateFEN } from '@blindfold-chess/features/chess-core/fen';

const MAX_QUERY_LENGTH = 1000;

/**
 * Encode FEN strings to Base64 for URL sharing
 */
export function encodeFensToBase64(fens: string[]): string {
  const joined = fens.join('\n');
  return btoa(joined);
}

/**
 * Decode Base64 string to FEN strings
 * Returns null if decoding fails
 */
export function decodeFensFromBase64(encoded: string): string[] | null {
  try {
    const decoded = atob(encoded);
    return decoded.split('\n').filter((line) => line.trim());
  } catch {
    return null;
  }
}

/**
 * Generate share URL with query parameters
 * @param locale - Current locale
 * @param fens - FEN strings to share
 * @param timeLimit - Memory time limit in seconds
 * @param shuffle - Whether to shuffle problems
 * @returns Object with url and isTooLong flag
 */
export function generateShareUrl(
  locale: Locale,
  fens: string[],
  timeLimit: number,
  shuffle: boolean
): { url: string; isTooLong: boolean } {
  const encoded = encodeFensToBase64(fens);
  const params = new URLSearchParams();

  params.set('problems', encoded);
  params.set('timeLimit', timeLimit.toString());
  params.set('shuffle', shuffle ? '1' : '0');

  const queryString = params.toString();
  const baseUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/practice/position-memory`;
  const url = `${baseUrl}?${queryString}`;

  return {
    url,
    isTooLong: encoded.length > MAX_QUERY_LENGTH,
  };
}

/**
 * Check if encoded FEN string exceeds max length
 */
export function isQueryTooLong(encoded: string): boolean {
  return encoded.length > MAX_QUERY_LENGTH;
}

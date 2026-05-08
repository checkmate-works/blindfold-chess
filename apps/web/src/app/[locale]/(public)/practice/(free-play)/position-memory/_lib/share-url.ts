export { validateFenFormat as validateFEN } from '@blindfold-chess/features/chess-core/fen';

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

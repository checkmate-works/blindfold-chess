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

/**
 * Encode a single FEN to a URL-safe Base64 (Base64URL) token: `+/` become
 * `-_` and the `=` padding is stripped, so the result is safe to drop into a
 * URL path segment without percent-encoding. FENs are ASCII, so `btoa` is
 * safe (no UTF-8 handling needed).
 *
 * Used by the "custom" instant-problem route
 * (`/practice/position-memory/custom/<token>`), which encodes the whole
 * problem in the URL instead of persisting a `positions` row.
 */
export function encodeFenToBase64Url(fen: string): string {
  return btoa(fen).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a Base64URL token produced by {@link encodeFenToBase64Url} back into
 * a FEN string. Returns null when the token is not valid Base64URL. The caller
 * is still responsible for structural FEN validation.
 */
export function decodeFenFromBase64Url(token: string): string | null {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

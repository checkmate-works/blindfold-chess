import { Chess } from 'chess.js';

import type { Locale } from '@/app/[locale]/_lib/types';

const MAX_QUERY_LENGTH = 1000;
const SEPARATOR = '\x00'; // Null character as separator between FEN and PGN

/**
 * Encode FEN and PGN to Base64 string
 */
export function encodeMoveSequenceToBase64(fen: string, pgn: string): string {
  const combined = `${fen}${SEPARATOR}${pgn}`;
  return btoa(combined);
}

/**
 * Decode Base64 string to FEN and PGN
 */
export function decodeMoveSequenceFromBase64(encoded: string): { fen: string; pgn: string } | null {
  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(SEPARATOR);
    if (separatorIndex === -1) {
      return null;
    }
    const fen = decoded.substring(0, separatorIndex);
    const pgn = decoded.substring(separatorIndex + 1);
    return { fen, pgn };
  } catch {
    return null;
  }
}

/**
 * Validate FEN string
 */
export function validateFEN(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if encoded string exceeds max length
 */
export function isQueryTooLong(encoded: string): boolean {
  return encoded.length > MAX_QUERY_LENGTH;
}

/**
 * Get max query length for validation
 */
export function getMaxQueryLength(): number {
  return MAX_QUERY_LENGTH;
}

/**
 * Generate share URL for move sequence
 */
export function generateShareUrl(
  locale: Locale,
  fen: string,
  pgn: string
): { url: string; isTooLong: boolean } {
  const encoded = encodeMoveSequenceToBase64(fen, pgn);
  const params = new URLSearchParams();

  params.set('data', encoded);

  const queryString = params.toString();
  const baseUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/practice/move-sequence`;
  const url = `${baseUrl}?${queryString}`;

  return {
    url,
    isTooLong: isQueryTooLong(encoded),
  };
}

import { describe, expect, it } from 'vitest';

import { decodeFenFromBase64Url, encodeFenToBase64Url } from './share-url';

describe('base64url FEN token', () => {
  const FENS = [
    '8/4PP1p/2p5/P3p3/7P/P7/3Pp3/8 w - - 0 1', // all-pawns, kingless (the 2kyu example)
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // start position
    '5rk1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1', // both castled
    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 4',
  ];

  it('round-trips every sample FEN', () => {
    for (const fen of FENS) {
      expect(decodeFenFromBase64Url(encodeFenToBase64Url(fen))).toBe(fen);
    }
  });

  it('produces URL-safe output (no +, /, or = padding)', () => {
    for (const fen of FENS) {
      const token = encodeFenToBase64Url(fen);
      expect(token).not.toMatch(/[+/=]/);
    }
  });

  it('matches the precomputed token for the 2kyu example FEN', () => {
    const token = encodeFenToBase64Url('8/4PP1p/2p5/P3p3/7P/P7/3Pp3/8 w - - 0 1');
    expect(token).toBe('OC80UFAxcC8ycDUvUDNwMy83UC9QNy8zUHAzLzggdyAtIC0gMCAx');
  });

  it('returns null for malformed / non-base64 tokens', () => {
    // `!` is outside the base64url alphabet, so atob throws.
    expect(decodeFenFromBase64Url('!!!notbase64!!!')).toBeNull();
    expect(decodeFenFromBase64Url('')).toBeNull();
  });
});

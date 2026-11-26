/**
 * The start → end tables of the 3kyu guide (diagonals), shared by the web's
 * guide pages and the app's copy of them. A diagonal runs up and to the
 * right, an anti-diagonal down and to the right; every one of them starts
 * on the a-file or on the edge rank it leaves from, so these four tables
 * list them all.
 */
export type DiagonalPair = { readonly start: string; readonly end: string };

/** Diagonals starting on the a-file, longest first. */
export const A_FILE_DIAGONALS: readonly DiagonalPair[] = [
  { start: "a1", end: "h8" },
  { start: "a2", end: "g8" },
  { start: "a3", end: "f8" },
  { start: "a4", end: "e8" },
  { start: "a5", end: "d8" },
  { start: "a6", end: "c8" },
  { start: "a7", end: "b8" },
];

/** Diagonals starting on the first rank (b1 onwards; a1 is the a-file's). */
export const RANK_1_DIAGONALS: readonly DiagonalPair[] = [
  { start: "b1", end: "h7" },
  { start: "c1", end: "h6" },
  { start: "d1", end: "h5" },
  { start: "e1", end: "h4" },
  { start: "f1", end: "h3" },
  { start: "g1", end: "h2" },
];

/** Anti-diagonals starting on the a-file, longest first. */
export const A_FILE_ANTI_DIAGONALS: readonly DiagonalPair[] = [
  { start: "a8", end: "h1" },
  { start: "a7", end: "g1" },
  { start: "a6", end: "f1" },
  { start: "a5", end: "e1" },
  { start: "a4", end: "d1" },
  { start: "a3", end: "c1" },
  { start: "a2", end: "b1" },
];

/** Anti-diagonals starting on the eighth rank (b8 onwards; a8 is the a-file's). */
export const RANK_8_ANTI_DIAGONALS: readonly DiagonalPair[] = [
  { start: "b8", end: "h2" },
  { start: "c8", end: "h3" },
  { start: "d8", end: "h4" },
  { start: "e8", end: "h5" },
  { start: "f8", end: "h6" },
  { start: "g8", end: "h7" },
];

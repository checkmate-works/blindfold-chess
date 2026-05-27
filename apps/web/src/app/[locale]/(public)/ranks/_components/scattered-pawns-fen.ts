/**
 * The 10-pawn "hard to memorize" example position for the 2kyu (chunking)
 * lesson. Shared by {@link ScatteredPawnsBoard} (guide board + rank-detail
 * card) and the guide's "solve this problem" CTA, whose href is the Base64URL
 * encoding of this exact FEN. Keeping it in one non-client module lets the
 * guide link layer reference the FEN without importing the client board.
 */
export const SCATTERED_PAWNS_FEN = '8/4PP1p/2p5/P3p3/7P/P7/3Pp3/8 w - - 0 1';

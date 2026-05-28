/**
 * The 10-piece "chunked" example position for the 2kyu (chunking) lesson — the
 * easy-to-memorize counterpart to {@link SCATTERED_PAWNS_FEN}: the same number
 * of pieces collapse into two recognizable kingside-castle patterns.
 *
 * Shared by the page-2 guide board and the page-2 "solve this problem" CTA,
 * whose href is the Base64URL encoding of this exact FEN. Kept in one non-client
 * module so the guide link layer can reference the FEN without importing a
 * client board component.
 */
export const CASTLED_KINGSIDE_FEN = '5rk1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1';

/**
 * The positions the dojo guides (教本) draw, shared by the web's guide pages
 * and the app's copy of them so both show the same boards. Each FEN is also
 * the one a guide links to (the web's "solve this problem" and "play this
 * against the AI" links encode it), so a board and its link cannot drift
 * apart.
 */

/**
 * The 10-pawn "hard to memorize" example of the 2kyu (chunking) lesson: ten
 * isolated facts that overrun working memory because they form no
 * recognizable pattern. Kingless, so it is not a legal game position; draw
 * it with the chess.js-free `fenToPlacements`, not a validating parser.
 */
export const SCATTERED_PAWNS_FEN = "8/4PP1p/2p5/P3p3/7P/P7/3Pp3/8 w - - 0 1";

/**
 * The 2kyu lesson's easy-to-memorize counterpart to
 * {@link SCATTERED_PAWNS_FEN}: the same number of pieces collapse into two
 * recognizable kingside-castle patterns.
 */
export const CASTLED_KINGSIDE_FEN = "5rk1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1";

/**
 * The classic 3-vs-3 pawn breakthrough of the 1kyu guide, an endgame
 * pattern worth memorising: with White to move, `1. b6` forces a passer
 * through however Black recaptures.
 */
export const PAWN_BREAKTHROUGH_FEN = "6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1";

/**
 * The forced winning line from {@link PAWN_BREAKTHROUGH_FEN}, in move-text
 * form. The web's move-reference parser and the app's replay both stop
 * silently at the first illegal move, so a test pins every ply as legal.
 */
export const BREAKTHROUGH_LINE =
  "1. b6 axb6 2. c6 bxc6 3. a6 Kf7 4. a7 b5 5. a8=Q";

/**
 * A minimal 2-pawns-vs-1 endgame (White Kd1/Pd2/Pe2 against Black
 * Ke8/Pe7): the first rung of the 1kyu guide's "play endgames against the
 * AI" ladder — few enough pieces to hold on a mental board, but a real
 * material edge to convert.
 */
export const TWO_PAWNS_VS_ONE_FEN = "4k3/4p3/8/8/8/8/3PP3/4K3 w - - 0 1";

/**
 * The SAN moves of a move-text line such as {@link BREAKTHROUGH_LINE}: move
 * numbers (`1.`, `3...`) are dropped and every other token is kept in order.
 */
export function moveLineSans(line: string): string[] {
  return line
    .split(/\s+/)
    .filter((token) => token !== "" && !/^\d+\.+$/.test(token));
}

/**
 * The classic 3-vs-3 pawn breakthrough, used on the 1kyu (opening / endgame
 * memorisation) guide as an endgame pattern worth memorising: with white to
 * move, `1. b6` forces a passer through no matter how black recaptures.
 *
 * Shared by the page-2 guide board and the page-2 move-reference line, which
 * replays the winning sequence from this exact position. Kept in one non-client
 * module so non-client layers can reference the FEN without importing a client
 * board component.
 */
export const PAWN_BREAKTHROUGH_FEN = '6k1/ppp5/8/PPP5/8/8/8/6K1 w - - 0 1';

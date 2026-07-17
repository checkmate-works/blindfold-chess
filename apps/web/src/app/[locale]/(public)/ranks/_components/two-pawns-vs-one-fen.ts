/**
 * A minimal 2-pawns-vs-1 endgame (white Kd1/Pd2/Pe2 against black Ke8/Pe7),
 * used on the 1kyu guide as the starting rung of the "play endgames against the
 * AI" ladder: few enough pieces to hold on a mental board, but a real material
 * edge to convert.
 *
 * Lives in its own non-client module so the guide's link layer can build the
 * `games/new/position?fen=` href from the same constant {@link TwoPawnsVsOneBoard}
 * renders — the board the reader sees and the position they land in cannot
 * drift apart.
 */
export const TWO_PAWNS_VS_ONE_FEN = '4k3/4p3/8/8/8/8/3PP3/4K3 w - - 0 1';

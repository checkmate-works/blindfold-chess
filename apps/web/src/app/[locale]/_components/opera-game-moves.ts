/**
 * The Opera Game — Paul Morphy vs. Duke Karl of Brunswick and Count Isouard,
 * Paris Opera, 1858. Used as the sample game in the algebraic-notation learn
 * article, where it is rendered as a clickable score by `OperaGameDemo`.
 *
 * Why this game: it is short (17 moves), real, and exercises almost every
 * notational device the article teaches — captures, a check, queenside
 * castling (O-O-O), a disambiguated move (11...Nbd7), and a mate (17. Rd8#).
 *
 * Why a single shared constant: the previous sample was hand-written
 * separately into the ja/en/es article bodies, and all three copies carried
 * the same illegal continuation (9. Qxc5 crossed three occupied squares).
 * One constant, one legality test, no per-locale drift.
 *
 * `OPERA_GAME_FINAL_FEN` is passed to `usePgnReplay` as `finalFen` so opening
 * the replay at the end costs no move replay; the test below the pair keeps
 * it in sync with the move list.
 */
export const OPERA_GAME_MOVES: readonly string[] = [
  'e4',
  'e5',
  'Nf3',
  'd6',
  'd4',
  'Bg4',
  'dxe5',
  'Bxf3',
  'Qxf3',
  'dxe5',
  'Bc4',
  'Nf6',
  'Qb3',
  'Qe7',
  'Nc3',
  'c6',
  'Bg5',
  'b5',
  'Nxb5',
  'cxb5',
  'Bxb5+',
  'Nbd7',
  'O-O-O',
  'Rd8',
  'Rxd7',
  'Rxd7',
  'Rd1',
  'Qe6',
  'Bxd7+',
  'Nxd7',
  'Qb8+',
  'Nxb8',
  'Rd8#',
];

export const OPERA_GAME_FINAL_FEN = '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17';

export const OPERA_GAME_RESULT = '1-0';

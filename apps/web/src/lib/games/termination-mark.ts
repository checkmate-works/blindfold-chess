import { fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';

/** Why the losing side's king is marked. */
export type TerminationMarkKind = 'checkmate' | 'resignation';

/** Where to draw the end-of-game mark, and which one. */
export type TerminationMark = {
  /** Algebraic square of the losing side's king. */
  square: string;
  kind: TerminationMarkKind;
};

/**
 * Badge appearance per kind, in renderer-neutral values (CSS and SVG both take
 * these strings verbatim).
 *
 * The glyph is named rather than drawn here: the DOM board reaches for the
 * shared icon data, and so can the SVG renderer, which cannot emit `<text>` at
 * all (the lambda has no fonts — see `renderBoardSvg`). Neither may substitute
 * a character literal for the mark.
 */
export const TERMINATION_MARK_STYLE = {
  checkmate: { fill: '#dc2626', glyph: 'hash' },
  resignation: { fill: '#475569', glyph: 'flag' },
} as const satisfies Record<TerminationMarkKind, { fill: string; glyph: 'hash' | 'flag' }>;

/**
 * The `#` glyph as four strokes on a 24×24 grid — chess notation's own mark for
 * checkmate, drawn rather than typed for the reason above. Paired with
 * `flagData` from `@blindfold-chess/icons/data`, which covers the other kind.
 */
export const HASH_GLYPH_PATHS = ['M9 3v18', 'M15 3v18', 'M3 9h18', 'M3 15h18'] as const;

/**
 * Which colour lost, from the player's own result and the side they had.
 * `null` for a draw or an unfinished game — nobody's king goes down.
 */
export function resolveLosingColor(
  playerResult: 'win' | 'loss' | 'draw' | null,
  playerSide: 'white' | 'black'
): 'w' | 'b' | null {
  if (playerResult !== 'win' && playerResult !== 'loss') return null;
  const playerColor = playerSide === 'white' ? 'w' : 'b';
  const opponentColor = playerColor === 'w' ? 'b' : 'w';
  return playerResult === 'loss' ? playerColor : opponentColor;
}

/**
 * Locate the end-of-game mark: the losing side's king square, plus whether it
 * fell to a mate or to a resignation.
 *
 * This is the whole rule, kept pure and renderer-free so every surface that
 * shows a finished game — the play board, the shared replay, the exported GIF —
 * marks the same square with the same meaning. A surface that recomputed "which
 * king" for itself is how the replay and the board would come to disagree about
 * a game they are both showing.
 *
 * Deriving the kind from the position rather than from stored data is
 * deliberate: resigning stamps a terminal status onto a position that is still
 * playable (`handleResign`), and nothing in the game record distinguishes it
 * from a real mate. The position can — if the loser is not actually mated, they
 * gave up.
 *
 * Returns null for a drawn or unfinished game, and for a position with no
 * losing king to mark (a fabricated FEN, a position edited down to bare kings).
 */
export function resolveTerminationMark({
  fen,
  losingColor,
  isCheckmate,
}: {
  /** The final position. */
  fen: string;
  /** Which colour lost, or null for a draw / game in progress. */
  losingColor: 'w' | 'b' | null;
  /** Whether the final position is itself checkmate. */
  isCheckmate: boolean;
}): TerminationMark | null {
  if (!losingColor) return null;

  const kingChar = losingColor === 'w' ? 'K' : 'k';
  const index = fenToBoardFlat(fen).indexOf(kingChar);
  if (index === -1) return null;

  // fenToBoardFlat is a8-first, rank by rank.
  const file = String.fromCharCode('a'.charCodeAt(0) + (index % 8));
  const rank = 8 - Math.floor(index / 8);

  return {
    square: `${file}${rank}`,
    kind: isCheckmate ? 'checkmate' : 'resignation',
  };
}

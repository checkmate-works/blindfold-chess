/**
 * Ply ↔ move-number arithmetic. Does NOT depend on `chess.js`.
 *
 * Reachable at `@blindfold-chess/features/chess-core/move-numbering` — its own
 * subpath, so importing it never pulls `chess.js` into a client bundle, the
 * same arrangement `fen-pure.ts` has.
 *
 * @design Why this is not per-caller arithmetic
 *
 * `Math.floor(i / 2)` looks like the whole rule and is not: a game that starts
 * from a mid-game FEN begins at that FEN's fullmove counter, and one that
 * starts with Black to move offsets the pairing by a half-move. Written out by
 * hand, the two branches differ only in a `+ 1` and which parity means White,
 * which is exactly the kind of difference that survives a copy-paste and then
 * gets fixed in one place. Every surface that numbers a move — recall, the
 * shared-game replay, move references in comments, the play-page change log,
 * repertoire lines — has to agree, because they name the same move to the same
 * reader.
 */

/**
 * The display move number and side for the `index`-th half-move (0-based).
 *
 * @param startsAsBlack - Whether the starting FEN has Black to move.
 * @param startMoveNumber - The starting FEN's fullmove counter.
 */
export function computeMoveNumber(
  index: number,
  startsAsBlack: boolean,
  startMoveNumber: number,
): { moveNumber: number; isWhiteMove: boolean } {
  const moveNumber = startsAsBlack
    ? startMoveNumber + Math.floor((index + 1) / 2)
    : startMoveNumber + Math.floor(index / 2);
  const isWhiteMove = startsAsBlack ? index % 2 === 1 : index % 2 === 0;

  return { moveNumber, isWhiteMove };
}

/**
 * Inverse of {@link computeMoveNumber}: given a "N." / "N..." reference,
 * find the 0-based ply it names. Returns -1 when the combination cannot occur
 * (e.g. a white-move reference numbered before the game's first move). Kept
 * next to its forward counterpart so the round-trip invariant stays in one
 * place — see the shared test file.
 */
export function plyFromMoveNumber(
  moveNumber: number,
  isWhiteMove: boolean,
  startsAsBlack: boolean,
  startMoveNumber: number,
): number {
  const k = moveNumber - startMoveNumber;
  if (k < 0) return -1;

  const ply = startsAsBlack
    ? isWhiteMove
      ? 2 * k - 1
      : 2 * k
    : isWhiteMove
      ? 2 * k
      : 2 * k + 1;

  return ply < 0 ? -1 : ply;
}

/**
 * The PGN-style prefix shown before a move's SAN — `"12."` for a white move,
 * `"12..."` for a black one. The three-dot form is what tells a reader the
 * move is Black's when White's half of the pair is not being shown.
 */
export function formatMoveAnchor(
  moveNumber: number,
  isWhiteMove: boolean,
): string {
  return isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`;
}

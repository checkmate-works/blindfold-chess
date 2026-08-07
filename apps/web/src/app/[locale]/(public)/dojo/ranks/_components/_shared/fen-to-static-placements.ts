type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
type PieceColor = 'w' | 'b';

export type StaticPiecePlacement = {
  square: string;
  type: PieceType;
  color: PieceColor;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const PIECE_LETTERS: ReadonlySet<string> = new Set(['k', 'q', 'r', 'b', 'n', 'p']);

/**
 * Parse the piece-placement field of a FEN into {@link StaticPiecePlacement}s.
 *
 * Deliberately chess.js-free (no validation): the rank guides include
 * illegal-by-the-rules positions such as a kingless all-pawns example, which
 * `chess.js` (and therefore `fenToBoard` / `ChessBoard`) would reject. Only
 * the board field is read; side-to-move / castling / clocks are ignored.
 *
 * Lives in its own directive-free module (not in `StaticPositionBoard.tsx`,
 * which is `'use client'`) so the Server Component guide boards can call it
 * at module scope — every export of a client module is a client reference,
 * and calling one during a server render throws at build time.
 */
export function fenToStaticPlacements(fen: string): StaticPiecePlacement[] {
  const boardField = fen.trim().split(/\s+/)[0] ?? '';
  const placements: StaticPiecePlacement[] = [];

  boardField.split('/').forEach((rankStr, rankIdx) => {
    const rankNumber = 8 - rankIdx;
    let fileIdx = 0;
    for (const ch of rankStr) {
      if (ch >= '1' && ch <= '8') {
        fileIdx += Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      const file = FILES[fileIdx];
      if (PIECE_LETTERS.has(lower) && file) {
        placements.push({
          square: `${file}${rankNumber}`,
          type: lower as PieceType,
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        });
      }
      fileIdx += 1;
    }
  });

  return placements;
}

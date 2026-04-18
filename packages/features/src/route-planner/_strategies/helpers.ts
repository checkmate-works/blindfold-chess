import { coordsToSquare } from "../coords";

/**
 * Returns the single square reached by offset `(f, r)`, or an empty list if it
 * is off the board. Shared by short-range pieces (e.g., knight).
 */
export const getValidMove = (f: number, r: number): string[] => {
  const sq = coordsToSquare(f, r);
  return sq ? [sq] : [];
};

/**
 * Returns every square reachable along the given sliding-piece directions
 * until the edge of the board. Shared by sliding pieces (bishop, rook, queen).
 */
export const getValidLines = (
  f: number,
  r: number,
  dirs: readonly (readonly number[])[],
): string[] => {
  return dirs.flatMap((d) => {
    const lineMoves: string[] = [];
    for (let i = 1; i < 8; i++) {
      const nf = f + d[0] * i;
      const nr = r + d[1] * i;
      const sq = coordsToSquare(nf, nr);
      if (sq) lineMoves.push(sq);
      else break;
    }
    return lineMoves;
  });
};

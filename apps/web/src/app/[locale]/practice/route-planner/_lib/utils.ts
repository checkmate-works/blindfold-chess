export type PieceType = 'N' | 'B' | 'R' | 'Q';

export const PIECES: PieceType[] = ['N', 'B', 'R', 'Q'];

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function squareToCoords(square: string): [number, number] {
  const file = FILES.indexOf(square[0]);
  const rank = RANKS.indexOf(square[1]);
  return [file, rank];
}

export function coordsToSquare(file: number, rank: number): string {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return '';
  return `${FILES[file]}${RANKS[rank]}`;
}

export function isValidSquare(square: string): boolean {
  if (!square) return false;
  return square.length === 2 && FILES.includes(square[0]) && RANKS.includes(square[1]);
}

export function getPossibleMoves(piece: PieceType, square: string): string[] {
  const [f, r] = squareToCoords(square);
  const moves: string[] = [];

  const addMove = (df: number, dr: number) => {
    const nf = f + df;
    const nr = r + dr;
    const sq = coordsToSquare(nf, nr);
    if (sq) moves.push(sq);
  };

  const addLine = (df: number, dr: number) => {
    for (let i = 1; i < 8; i++) {
      const nf = f + df * i;
      const nr = r + dr * i;
      const sq = coordsToSquare(nf, nr);
      if (sq) moves.push(sq);
      else break;
    }
  };

  if (piece === 'N') {
    const jumps = [
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
    ];
    jumps.forEach((d) => addMove(d[0], d[1]));
  }

  if (piece === 'B' || piece === 'Q') {
    const dirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    dirs.forEach((d) => addLine(d[0], d[1]));
  }

  if (piece === 'R' || piece === 'Q') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach((d) => addLine(d[0], d[1]));
  }

  return moves;
}

export function findShortestPath(piece: PieceType, start: string, end: string): string[] | null {
  if (start === end) return [start];

  const queue: [string, string[]][] = [[start, [start]]];
  const visited = new Set<string>([start]);

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;

    if (current === end) {
      return path; // Returns full path including start
    }

    const moves = getPossibleMoves(piece, current);
    for (const move of moves) {
      if (!visited.has(move)) {
        visited.add(move);
        queue.push([move, [...path, move]]);
      }
    }
  }

  return null;
}

/**
 * Validates a user-provided path sequence starting from a given square.
 * @param piece The piece type
 * @param start The starting square (e.g. 'f6')
 * @param userPath The sequence of squares entered by user (e.g. ['e4', 'd2'])
 * @param goal The goal square (e.g. 'd2')
 */
export function validateUserPath(
  piece: PieceType,
  start: string,
  userPath: string[],
  goal: string
): { valid: boolean; error?: string; fullPath?: string[] } {
  if (userPath.length === 0) return { valid: false, error: 'Empty path' };

  // Check if goal is reached
  const lastUserSquare = userPath[userPath.length - 1];
  if (lastUserSquare !== goal) {
    return { valid: false, error: 'Path does not end at goal' };
  }

  let current = start;
  const fullPath = [start];

  for (const nextSquare of userPath) {
    if (!isValidSquare(nextSquare)) return { valid: false, error: `Invalid square: ${nextSquare}` };

    const possible = getPossibleMoves(piece, current);
    if (!possible.includes(nextSquare)) {
      return { valid: false, error: `Invalid move` };
    }
    current = nextSquare;
    fullPath.push(current);
  }

  return { valid: true, fullPath };
}

export function getRandomSquare(): string {
  const f = Math.floor(Math.random() * 8);
  const r = Math.floor(Math.random() * 8);
  return coordsToSquare(f, r);
}

export function isSameColor(sq1: string, sq2: string): boolean {
  const [f1, r1] = squareToCoords(sq1);
  const [f2, r2] = squareToCoords(sq2);
  return (f1 + r1) % 2 === (f2 + r2) % 2;
}

export function generateProblem(allowedPieces: PieceType[] = PIECES): {
  piece: PieceType;
  start: string;
  end: string;
} {
  let piece: PieceType;
  let start: string;
  let end: string;
  let path: string[] | null;

  // Retry until we find a non-trivial problem (at least 2 moves required)
  // path length includes start, so length 2 means 1 move (Start->End).
  // We want length >= 3 (Start->Mid->End).
  do {
    // Fallback to all pieces if allowedPieces is empty
    const pool = allowedPieces.length > 0 ? allowedPieces : PIECES;
    piece = pool[Math.floor(Math.random() * pool.length)];
    start = getRandomSquare();
    end = getRandomSquare();

    while (start === end) {
      end = getRandomSquare();
    }

    if (piece === 'B') {
      while (!isSameColor(start, end) || start === end) {
        end = getRandomSquare();
      }
    }

    path = findShortestPath(piece, start, end);
  } while (!path || path.length < 3);

  return { piece, start, end };
}

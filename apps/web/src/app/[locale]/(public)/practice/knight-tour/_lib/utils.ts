/**
 * Utility functions for Knight's Tour puzzle
 */

// All squares on the board
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Knight move offsets (L-shaped: 2 squares in one direction, 1 in perpendicular)
const KNIGHT_MOVES = [
  { file: 2, rank: 1 },
  { file: 2, rank: -1 },
  { file: -2, rank: 1 },
  { file: -2, rank: -1 },
  { file: 1, rank: 2 },
  { file: 1, rank: -2 },
  { file: -1, rank: 2 },
  { file: -1, rank: -2 },
];

/**
 * Parse a square notation (e.g., 'e4') into file and rank indices
 */
export function parseSquare(square: string): { fileIndex: number; rankIndex: number } | null {
  if (square.length !== 2) return null;
  const file = square[0].toLowerCase();
  const rank = square[1];
  const fileIndex = FILES.indexOf(file);
  const rankIndex = RANKS.indexOf(rank);
  if (fileIndex === -1 || rankIndex === -1) return null;
  return { fileIndex, rankIndex };
}

/**
 * Convert file and rank indices to square notation
 */
export function toSquare(fileIndex: number, rankIndex: number): string | null {
  if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) return null;
  return `${FILES[fileIndex]}${RANKS[rankIndex]}`;
}

/**
 * Get all legal knight moves from a given square
 */
export function getKnightMoves(square: string): string[] {
  const parsed = parseSquare(square);
  if (!parsed) return [];

  const moves: string[] = [];
  for (const offset of KNIGHT_MOVES) {
    const newFile = parsed.fileIndex + offset.file;
    const newRank = parsed.rankIndex + offset.rank;
    const targetSquare = toSquare(newFile, newRank);
    if (targetSquare) {
      moves.push(targetSquare);
    }
  }
  return moves;
}

/**
 * Get available (unvisited) knight moves from a given square
 * @param square - Current square
 * @param visitedSquares - Set or Map of visited squares
 */
export function getAvailableKnightMoves(
  square: string,
  visitedSquares: Set<string> | Map<string, number>
): string[] {
  return getKnightMoves(square).filter((move) => !visitedSquares.has(move));
}

/**
 * Check if a move is a valid knight move
 */
export function isValidKnightMove(from: string, to: string): boolean {
  const moves = getKnightMoves(from);
  return moves.includes(to);
}

/**
 * Get all 64 squares
 */
export function getAllSquares(): string[] {
  const squares: string[] = [];
  for (const rank of RANKS) {
    for (const file of FILES) {
      squares.push(`${file}${rank}`);
    }
  }
  return squares;
}

/**
 * Get a random square
 */
export function getRandomSquare(): string {
  const file = FILES[Math.floor(Math.random() * 8)];
  const rank = RANKS[Math.floor(Math.random() * 8)];
  return `${file}${rank}`;
}

/**
 * Apply Warnsdorff's rule to sort moves by accessibility
 * (prioritize squares with fewer unvisited neighbors)
 */
export function sortByWarnsdorff(
  moves: string[],
  visitedSquares: Set<string> | Map<string, number>
): string[] {
  return moves.sort((a, b) => {
    const aNeighbors = getAvailableKnightMoves(a, visitedSquares).length;
    const bNeighbors = getAvailableKnightMoves(b, visitedSquares).length;
    return aNeighbors - bNeighbors;
  });
}

/**
 * Check if the tour is complete (all 64 squares visited)
 */
export function isTourComplete(visitedSquares: Set<string> | Map<string, number>): boolean {
  return visitedSquares.size === 64;
}

/**
 * Check if the tour is stuck (no more valid moves)
 */
export function isTourStuck(
  currentSquare: string,
  visitedSquares: Set<string> | Map<string, number>
): boolean {
  return getAvailableKnightMoves(currentSquare, visitedSquares).length === 0;
}

/**
 * Check if a closed tour is possible (can return to starting square)
 */
export function isClosedTourPossible(
  currentSquare: string,
  startingSquare: string,
  visitedSquares: Set<string> | Map<string, number>
): boolean {
  if (visitedSquares.size !== 64) return false;
  return isValidKnightMove(currentSquare, startingSquare);
}

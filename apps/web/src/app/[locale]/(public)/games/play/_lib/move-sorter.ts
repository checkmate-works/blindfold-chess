/**
 * Sort chess moves by piece type, then alphabetically within each group.
 *
 * Sorting order:
 * 1. Pawn moves (e.g., a3, a4, axb3, b3, b4, bxa3)
 * 2. Knight moves (e.g., Na3, Nbd2, Nc3, Nf3, Nxd5)
 * 3. Bishop moves (e.g., Bb5, Bc4, Bd2, Bxf7)
 * 4. Rook moves (e.g., Ra3, Rb1, Rc1, Rxe1)
 * 5. Queen moves (e.g., Qa4, Qb3, Qd2, Qxe5)
 * 6. King moves (e.g., Kd2, Ke2, Kxf2)
 * 7. Castling moves (e.g., O-O, O-O-O)
 *
 * Within each group, moves are sorted alphabetically.
 * Captures (x) and checks (+, #) do not affect the sort order.
 */
export function sortMoves<T extends string>(moves: readonly T[]): T[] {
  return [...moves].sort((a, b) => {
    const priorityA = getPiecePriority(a);
    const priorityB = getPiecePriority(b);

    // First, sort by piece type
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within the same piece type, sort alphabetically
    return a.localeCompare(b);
  });
}

/**
 * Get the priority of a move based on its piece type.
 * Lower numbers indicate higher priority (appear first in sorted list).
 */
function getPiecePriority(move: string): number {
  // Castling moves (special moves at the end)
  if (move.startsWith('O-O')) return 6;

  // Piece moves (identified by uppercase letter at start)
  if (move[0] === 'N') return 1; // Knight
  if (move[0] === 'B') return 2; // Bishop
  if (move[0] === 'R') return 3; // Rook
  if (move[0] === 'Q') return 4; // Queen
  if (move[0] === 'K') return 5; // King

  // Pawn moves (lowercase letter or no piece indicator)
  return 0;
}

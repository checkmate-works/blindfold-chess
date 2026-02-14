export function generateRandomSquare(): string {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
  return (
    files[Math.floor(Math.random() * files.length)] +
    ranks[Math.floor(Math.random() * ranks.length)]
  );
}

export function generateSquareSequence(count: number): string[] {
  const squares: string[] = [];
  const usedSquares = new Set<string>();

  while (squares.length < count) {
    const square = generateRandomSquare();
    if (!usedSquares.has(square)) {
      usedSquares.add(square);
      squares.push(square);
    }

    // Reset after using half the board (32/64 squares) to allow re-use
    // while maintaining variety in consecutive questions
    if (usedSquares.size >= 32 && squares.length < count) {
      usedSquares.clear();
    }
  }

  return squares;
}

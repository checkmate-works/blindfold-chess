import { FILES, RANKS } from "./constants";

export function isValidSquare(square: string): boolean {
  return /^[a-h][1-8]$/.test(square);
}

export function computeSquareColor(square: string): "light" | "dark" {
  const file = square.charCodeAt(0) - 97; // a=0, b=1, ..., h=7
  const rank = parseInt(square[1]) - 1; // 1=0, 2=1, ..., 8=7
  return (file + rank) % 2 === 0 ? "dark" : "light";
}

export function generateRandomSquare(): string {
  return (
    FILES[Math.floor(Math.random() * FILES.length)] +
    RANKS[Math.floor(Math.random() * RANKS.length)]
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

export type Square = string;

export function isValidSquare(square: string): boolean {
  const regex = /^[a-h][1-8]$/;
  return regex.test(square);
}

export function getSquareColor(square: string): 'light' | 'dark' | null {
  if (!isValidSquare(square)) {
    return null;
  }

  const file = square.charCodeAt(0) - 97; // a=0, b=1, ..., h=7
  const rank = parseInt(square[1]) - 1; // 1=0, 2=1, ..., 8=7

  // A square is light if the sum of file and rank is even
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

export function generateRandomSquare(): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const randomFile = files[Math.floor(Math.random() * files.length)];
  const randomRank = ranks[Math.floor(Math.random() * ranks.length)];

  return randomFile + randomRank;
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

    // Reset if we've used too many squares
    if (usedSquares.size >= 32 && squares.length < count) {
      usedSquares.clear();
    }
  }

  return squares;
}

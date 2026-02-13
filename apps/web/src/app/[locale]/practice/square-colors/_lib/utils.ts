export { generateRandomSquare, generateSquareSequence } from '../../_lib/utils';

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

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export type File = (typeof FILES)[number];
export type Rank = (typeof RANKS)[number];
export type Square = `${File}${Rank}`;

export const VALID_FILES = FILES;
export const VALID_RANKS = RANKS;

export function isValidSquare(value: string): value is Square {
  if (value.length !== 2) return false;
  const file = value[0];
  const rank = value[1];
  return (FILES as readonly string[]).includes(file) && (RANKS as readonly string[]).includes(rank);
}

export function getAllSquares(): Square[] {
  const squares: Square[] = [];
  for (const rank of [...RANKS].reverse()) {
    for (const file of FILES) {
      squares.push(`${file}${rank}` as Square);
    }
  }
  return squares;
}

export function isLightSquare(square: Square): boolean {
  const fileIndex = FILES.indexOf(square[0] as File);
  const rankIndex = RANKS.indexOf(square[1] as Rank);
  return (fileIndex + rankIndex) % 2 === 1;
}

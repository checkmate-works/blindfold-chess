/**
 * Parse FEN metadata to determine starting side and move number.
 */
export function parseFenMeta(fen: string | undefined | null): {
  startsAsBlack: boolean;
  startMoveNumber: number;
} {
  if (!fen) {
    return { startsAsBlack: false, startMoveNumber: 1 };
  }

  const parts = fen.split(' ');
  return {
    startsAsBlack: parts[1] === 'b',
    startMoveNumber: parseInt(parts[5]) || 1,
  };
}

/**
 * Convert a FEN string to a Lichess analysis URL
 * @param fen - The FEN string representing the chess position
 * @returns The Lichess analysis URL
 */
export function fenToLichessUrl(fen: string): string {
  // Replace spaces with underscores for URL encoding
  const encodedFen = fen.replace(/ /g, '_');
  return `https://lichess.org/analysis/standard/${encodedFen}`;
}

/** Expands a FEN rank string into an 8-element array of piece characters (or empty string). */
export function expandRank(rank: string): string[] {
  const result: string[] = [];
  for (const ch of rank) {
    const digit = Number(ch);
    if (digit >= 1 && digit <= 8) {
      for (let i = 0; i < digit; i++) result.push('');
    } else {
      result.push(ch);
    }
  }
  return result;
}

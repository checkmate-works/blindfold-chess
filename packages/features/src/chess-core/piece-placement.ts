/**
 * The piece-placement check (the first FEN field) shared by
 * `validateFenFormat` in `./fen-pure.ts` and `validateFenStructure` in
 * `./validate-fen-structure.ts`.
 *
 * The two validators differ on purpose in everything around the board —
 * how fields are split, how many are required, which ones are checked — but
 * a board one of them accepts and the other rejects is a bug. Each used to
 * scan the ranks itself, and the copies had already drifted: only one of
 * them rejected a rank like "17", whose digits add up to eight squares but
 * which no canonical FEN (and not chess.js) accepts. Keeping the scan here
 * makes the board rule one rule.
 *
 * chess.js-free, and not exported from any barrel: callers go through the
 * two validators.
 */

/**
 * Why a piece placement is malformed. `rank` is the FEN rank number, 8 for
 * the first rank listed down to 1 for the last.
 */
export type PiecePlacementError =
  | { kind: "rankCount" }
  | { kind: "invalidCharacters"; rank: number }
  | { kind: "consecutiveDigits"; rank: number }
  | { kind: "squareCount"; rank: number };

const VALID_RANK_CHARS = /^[PNBRQKpnbrqk1-8]+$/;

/**
 * Check a piece placement: 8 ranks separated by `/`, each made only of
 * `PNBRQKpnbrqk` and the digits 1-8, with no two digits in a row, covering
 * exactly 8 squares. Returns the first problem found, ranks in FEN order, or
 * null when the placement is well-formed.
 *
 * Kings, pawns on the back ranks and every other legal-chess invariant are
 * not checked.
 */
export function findPiecePlacementError(
  placement: string,
): PiecePlacementError | null {
  const ranks = placement.split("/");
  if (ranks.length !== 8) return { kind: "rankCount" };

  for (let i = 0; i < 8; i++) {
    const rank = ranks[i];
    const rankNumber = 8 - i;
    // VALID_RANK_CHARS needs at least one character, so an empty rank ("//")
    // fails here too.
    if (!VALID_RANK_CHARS.test(rank)) {
      return { kind: "invalidCharacters", rank: rankNumber };
    }
    let sum = 0;
    let previousWasDigit = false;
    for (const ch of rank) {
      // The rank is now only digits 1-8 and piece letters, and every letter
      // sorts after "8".
      if (ch <= "8") {
        // Canonical FEN writes each run of empty squares as one digit. Digits
        // in a row ("17", "44") can still add up to eight, so the sum check
        // below would let them through.
        if (previousWasDigit) {
          return { kind: "consecutiveDigits", rank: rankNumber };
        }
        sum += parseInt(ch, 10);
        previousWasDigit = true;
      } else {
        sum += 1;
        previousWasDigit = false;
      }
    }
    if (sum !== 8) return { kind: "squareCount", rank: rankNumber };
  }

  return null;
}

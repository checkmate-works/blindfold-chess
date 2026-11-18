/**
 * PGN display formatting that does NOT depend on `chess.js`.
 *
 * Re-exported from `./pgn.ts` and therefore from the chess-core barrel, so
 * existing callers are unaffected. Consumers that import from
 * `@blindfold-chess/features/chess-core/pgn-format` (the subpath export wired
 * via the package's `exports` field) receive ONLY this file's contents and
 * never pull `chess.js` into their bundle — the same arrangement `fen-pure.ts`
 * has, and for the same reason: a surface that merely lays moves out in
 * numbered pairs should not ship an engine to do it.
 *
 * If you add a formatter that needs chess.js, put it in `pgn.ts` — do NOT
 * import `chess.js` into this file.
 */

/**
 * A single move pair in structured PGN representation.
 *
 * Move strings are typed as `string` (not `AlgebraicNotation`) because this
 * type is used for display formatting where moves have already been validated
 * elsewhere (e.g. via `useNotation` or `parsePgnMoveSequence`).
 */
export type FormattedPgnMove = {
  moveNumber: number;
  whiteMove?: string;
  whiteMoveIndex?: number;
  blackMove?: string;
  blackMoveIndex?: number;
};

/**
 * An array of structured move pairs.
 */
export type FormattedPgn = FormattedPgnMove[];

/**
 * A parsed move entry with move number and optional white/black moves.
 *
 * Moves are typed as `string | null` rather than `AlgebraicNotation | null`
 * because this type represents the raw result of PGN text parsing (regex).
 * Move legality is not verified at parse time — use `validatePgnMoves` or
 * `parsePgnMoveSequence` to validate parsed moves against a position.
 */
export type ParsedPgnMove = {
  moveNumber: number;
  white: string | null;
  black: string | null;
};

/**
 * Format a flat list of moves into structured PGN move pairs.
 *
 * Handles both standard (white-first) and black-first starting positions;
 * `startMoveNumber` comes from the starting FEN's fullmove counter (see e.g.
 * `parseFenMeta` in apps/web). Moves are display-formatted as-is — validate
 * legality elsewhere.
 */
export function formatMovesToPgn(
  userMoves: readonly string[],
  startsAsBlack: boolean,
  startMoveNumber: number,
): FormattedPgnMove[] {
  if (userMoves.length === 0) return [];

  const formatted: FormattedPgnMove[] = [];
  // Every entry after a black-first opener is a full move, so the number
  // simply counts up from the start.
  let moveNumber = startMoveNumber;
  let i = 0;

  if (startsAsBlack) {
    formatted.push({ moveNumber, blackMove: userMoves[0], blackMoveIndex: 0 });
    moveNumber++;
    i = 1;
  }
  for (; i < userMoves.length; i += 2) {
    formatted.push({
      moveNumber,
      whiteMove: userMoves[i],
      whiteMoveIndex: i,
      blackMove: userMoves[i + 1],
      blackMoveIndex: userMoves[i + 1] !== undefined ? i + 1 : undefined,
    });
    moveNumber++;
  }

  return formatted;
}

/**
 * Format structured PGN move pairs to a PGN text string.
 * Optionally includes FEN header for custom starting positions.
 */
export function formatPgnToText(
  formattedPgn: FormattedPgn,
  startingFen?: string,
): string {
  const movesText = formattedPgn
    .map((move) => {
      const moveNumber = `${move.moveNumber}.`;
      if (!move.whiteMove && move.blackMove) {
        return `${moveNumber}.. ${move.blackMove}`;
      }
      const movePair = move.blackMove
        ? `${moveNumber} ${move.whiteMove} ${move.blackMove}`
        : `${moveNumber} ${move.whiteMove}`;
      return movePair;
    })
    .join(" ");

  if (startingFen) {
    return `[SetUp "1"]\n[FEN "${startingFen}"]\n\n${movesText}`;
  }

  return movesText;
}

/**
 * Get PGN auto-completion suggestion based on current input.
 * Returns the next move number only when both moves in a pair are complete.
 * Uses pattern matching instead of parsing, so it works with any starting position.
 */
export function getPgnSuggestion(pgn: string): string | null {
  // Empty or blank input has no move number either, so it lands here too.
  if (!pgn.match(/\d+\./)) {
    return "1. ";
  }

  // Trailing whitespace needs no trimming: no group below can match it.
  const movePattern = /(\d+)\.\s*(\S+)(?:\s+(\S+))?/g;
  const last = [...pgn.matchAll(movePattern)].at(-1);

  if (last) {
    const lastMoveNumber = parseInt(last[1], 10);
    const pairComplete = !!last[2] && !!last[3];
    if (lastMoveNumber > 0 && pairComplete) {
      return ` ${lastMoveNumber + 1}. `;
    }
  }

  return null;
}

/**
 * Parse PGN move text into structured moves.
 * Format: "1. Kb3 Kc5 2. Kc3 Kd5 3. Kd3 Ke5"
 */
export function parsePgnMoves(pgn: string): ParsedPgnMove[] {
  const moves: ParsedPgnMove[] = [];

  // `\s` matches newlines and tabs as well as spaces, and the pattern finds
  // the next move number wherever it starts, so the text needs no trimming or
  // whitespace normalising first.
  const movePattern = /(\d+)\.\s*(\S+)?(?:\s+(\S+))?/g;

  let match;
  while ((match = movePattern.exec(pgn)) !== null) {
    const moveNumber = parseInt(match[1], 10);
    const firstMove = match[2] || null;
    const secondMove = match[3] || null;

    if (firstMove && firstMove.startsWith(".")) {
      moves.push({
        moveNumber,
        white: null,
        black: firstMove.replace(/^\.+/, ""),
      });
    } else {
      moves.push({
        moveNumber,
        white: firstMove,
        black: secondMove,
      });
    }
  }

  return moves;
}

/**
 * Convert parsed moves to a flat array of move strings.
 */
export function flattenPgnMoves(parsedMoves: ParsedPgnMove[]): string[] {
  const moves: string[] = [];

  for (const move of parsedMoves) {
    if (move.white) {
      moves.push(move.white);
    }
    if (move.black) {
      moves.push(move.black);
    }
  }

  return moves;
}

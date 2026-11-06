/** Which UCI response a message corresponds to. */
export type UciResponseType = "uciok" | "readyok" | "bestmove" | "info";

/**
 * A recognised engine output line, or `null` for anything else — including
 * `info` lines without a `score` and a `bestmove` line with no move.
 */
export type ParsedUciResponse =
  | { type: "uciok"; raw: string }
  | { type: "readyok"; raw: string }
  | { type: "bestmove"; raw: string; move: string; ponder?: string }
  | { type: "info"; raw: string }
  | null;

/**
 * Parse a raw UCI engine output line into a structured response.
 */
export function parseUciResponse(message: string): ParsedUciResponse {
  if (message.includes("uciok")) {
    return { type: "uciok", raw: message };
  }

  if (message.includes("readyok")) {
    return { type: "readyok", raw: message };
  }

  if (message.includes("bestmove")) {
    const match = message.match(/bestmove (\w+)(?:\s+ponder (\w+))?/);
    if (match) {
      return {
        type: "bestmove",
        raw: message,
        move: match[1],
        ponder: match[2],
      };
    }
    return null;
  }

  if (message.includes("info") && message.includes("score")) {
    return { type: "info", raw: message };
  }

  return null;
}

/**
 * A UCI score as the engine reports it: from the side to move's point of
 * view, in centipawns (`cp`) or as moves to mate (`mate`, negative when the
 * side to move is the one being mated).
 */
export type UciScore =
  { kind: "cp"; value: number } | { kind: "mate"; value: number };

/**
 * Extract the score from a UCI `info` line, or `null` if it carries none.
 * The value is not normalised to white's perspective.
 */
export function parseUciScore(infoLine: string): UciScore | null {
  const cpMatch = infoLine.match(/score cp (-?\d+)/);
  if (cpMatch) {
    return { kind: "cp", value: parseInt(cpMatch[1], 10) };
  }

  const mateMatch = infoLine.match(/score mate (-?\d+)/);
  if (mateMatch) {
    return { kind: "mate", value: parseInt(mateMatch[1], 10) };
  }

  return null;
}

/**
 * Build the UCI "position" command string.
 */
export function buildPositionCommand(fen: string, uciMoves?: string[]): string {
  if (uciMoves && uciMoves.length > 0) {
    return `position fen ${fen} moves ${uciMoves.join(" ")}`;
  }
  return `position fen ${fen}`;
}

/**
 * Build the UCI "go" command string.
 */
export function buildGoCommand(options: {
  movetime?: number;
  depth?: number;
}): string {
  if (options.depth !== undefined) {
    return `go depth ${options.depth}`;
  }
  return `go movetime ${options.movetime ?? 1000}`;
}

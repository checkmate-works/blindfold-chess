import type { AiGameStart } from "@blindfold-chess/features/ai-game";
import { validateFen } from "@blindfold-chess/features/chess-core";
import type { AlgebraicNotation } from "@blindfold-chess/types";

/**
 * Route params that carry a custom start from the setup screen to the session.
 *
 * The start travels as route params rather than through an in-memory store:
 * on native, Expo Router keeps params in the navigation state, so there is no
 * URL length limit for a long PGN to hit, and the session stays reconstructible
 * from its params alone (a store would be empty after a reload or a deep link,
 * and would need clearing when the game ends). The shape mirrors the web
 * `/games/play` URL — `fen` for the starting position, `moves` as a JSON array
 * of SAN — so both platforms speak the same contract.
 */
export type AiGameStartParams = {
  fen?: string;
  moves?: string;
};

/** Only the params a non-standard start needs; the standard start sends none. */
export function encodeStartParams(start: AiGameStart): AiGameStartParams {
  return {
    ...(start.startingFen && { fen: start.startingFen }),
    ...(start.moves.length > 0 && { moves: JSON.stringify(start.moves) }),
  };
}

/**
 * Reads the start back from route params, which may come from a deep link and
 * so may hold anything. A FEN that is not valid is dropped (standard start)
 * and `moves` that is not a JSON array of strings is treated as no moves; the
 * session's replay then stops at the first illegal move, so a junk move list
 * cannot produce an impossible position.
 */
export function decodeStartParams(params: AiGameStartParams): AiGameStart {
  const startingFen =
    params.fen && validateFen(params.fen) ? params.fen : undefined;
  return {
    ...(startingFen && { startingFen }),
    moves: parseMoves(params.moves),
  };
}

function parseMoves(raw: string | undefined): AlgebraicNotation[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((move): move is string => typeof move === "string")
    ) {
      // Legality is checked by the session's replay, not here.
      return parsed as AlgebraicNotation[];
    }
  } catch {
    // Fall through: unreadable moves mean no moves.
  }
  return [];
}

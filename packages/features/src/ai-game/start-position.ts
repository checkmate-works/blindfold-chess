/**
 * Turning what a player typed on an AI-game setup form (a FEN or a PGN) into
 * the start of a game: an optional starting FEN plus the moves already
 * played from it. The session replays those moves and then hands the turn to
 * whichever side is to move, so the engine moves first when it is its turn.
 */
import { pieceColorToSide } from "@blindfold-chess/types";
import type {
  AlgebraicNotation,
  PieceColor,
  Side,
} from "@blindfold-chess/types";

import {
  buildFenFromParts,
  clampFenParts,
  NO_CASTLING_RIGHTS,
  parseCastlingField,
  parseFenFields,
} from "../chess-core/fen-fields";
import {
  getPgnHeaders,
  getPgnHistory,
  parsePgnWithFen,
  validatePgn,
} from "../chess-core/pgn";
import {
  type PositionErrorKey,
  validatePosition,
} from "../chess-core/position";
import type { MoveResult } from "../chess-core/types";
import { type Result, err, ok } from "../utils/result";

/** Where an AI game begins. `startingFen` absent means the standard position. */
export type AiGameStart = {
  startingFen?: string;
  moves: AlgebraicNotation[];
};

/**
 * Why a FEN cannot start a game, as the key of the message to show.
 * `positionCheckCorrected` is the case `validatePosition` reports as
 * `correctedColor`: the side NOT to move is in check, so the position is only
 * legal with the other side to move and the form should ask for that.
 */
export type FenStartErrorKey = PositionErrorKey | "positionCheckCorrected";

/**
 * Resolves a FEN typed into a set-up form into a starting position.
 *
 * Only the placement is required; `sideToMove` overrides the FEN's own field
 * (the form shows it as a separate control), castling defaults to none and
 * en-passant to `-`. Castling rights and an en-passant target the placement
 * cannot support are dropped rather than rejected (see `clampFenParts`), and
 * the clocks are reset. The assembled FEN is then checked by
 * `validatePosition`, the same check the web position form applies.
 */
export function resolveFenStart(
  fenInput: string,
  sideToMove: PieceColor,
): Result<AiGameStart, FenStartErrorKey> {
  const fields = parseFenFields(fenInput);
  if (!fields) return err("positionEmpty");

  const { castling, enPassant } = clampFenParts(
    fields.placement,
    sideToMove,
    fields.castling ? parseCastlingField(fields.castling) : NO_CASTLING_RIGHTS,
    fields.enPassant ?? "-",
  );
  const fullFen = buildFenFromParts(
    fields.placement,
    sideToMove,
    castling,
    enPassant,
  );

  const validity = validatePosition(fields.placement, fullFen);
  if (!validity.valid) return err(validity.errorKey);
  if (validity.correctedColor) return err("positionCheckCorrected");

  return ok({ startingFen: fullFen, moves: [] });
}

/** Why a PGN cannot start a game. */
export type PgnStartErrorKey = "pgnEmpty" | "invalidPgn";

/**
 * Resolves a pasted PGN into its `[FEN]` starting position (when it names a
 * non-standard one) and its mainline moves.
 */
export function resolvePgnStart(
  pgn: string,
): Result<AiGameStart, PgnStartErrorKey> {
  if (!pgn.trim()) return err("pgnEmpty");
  if (!validatePgn(pgn)) return err("invalidPgn");
  const parsed = parsePgnWithFen(pgn);
  if (!parsed.ok) return err("invalidPgn");
  return ok({
    moves: parsed.value.moves,
    ...(parsed.value.startingFen && {
      startingFen: parsed.value.startingFen,
    }),
  });
}

/**
 * The colour a player most likely wants when continuing a pasted PGN: the
 * side to move after its last move, so the player answers the game rather
 * than the engine. A PGN with no moves falls back to its `[FEN]` header's side
 * to move.
 *
 * @returns `null` when the PGN is empty, invalid, or names no side to move —
 *   callers then keep their current selection instead of guessing.
 */
export function deriveSideFromPgn(pgn: string): Side | null {
  if (!pgn.trim() || !validatePgn(pgn)) return null;
  try {
    // `verbose: true` selects the MoveResult overload of the return union.
    const history = getPgnHistory(pgn, { verbose: true }) as MoveResult[];
    if (history.length > 0) {
      return history[history.length - 1].color === "w" ? "black" : "white";
    }
    const headers = getPgnHeaders(pgn);
    const sideToMove = headers.FEN
      ? parseFenFields(headers.FEN)?.sideToMove
      : null;
    return sideToMove ? pieceColorToSide(sideToMove) : null;
  } catch {
    return null;
  }
}

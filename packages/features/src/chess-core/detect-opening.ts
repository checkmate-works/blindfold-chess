import { getStartingFen, toPositionKey } from "./fen";
import { replayMoves } from "./moves";

/**
 * detect-opening: identify which named opening a finished game played.
 *
 * Mirrors lichess's approach: a game's opening is the *deepest* known opening
 * position the game passed through — the most specific match, not the first.
 * A game that reaches the Berlin Defence is reported as "Ruy Lopez: Berlin
 * Defense", not the shallower "Ruy Lopez" it also passed through.
 *
 * Matching is by *resulting position* (the position-identity key — the first
 * four FEN fields, clocks dropped — see {@link toPositionKey}), NOT by raw SAN
 * prefix. This makes detection robust to transpositions: a game that reaches a
 * known opening's signature position by a different move order still matches.
 *
 * Openings are defined from the standard initial position, so games that start
 * from a custom FEN are never assigned an opening (same rule lichess applies to
 * variants / set-up positions).
 *
 * The core is deliberately DB-agnostic: it works against an {@link OpeningIndex}
 * built from `{ id, fen }` entries and returns the matched `id` + ply. The
 * caller owns the opening records and looks the rest up by `id` — the same
 * decoupling as {@link matchGameAgainstLines} returning an index.
 */

/** A single opening: an opaque id plus the FEN of its signature position. */
export type OpeningEntry = {
  /** Opaque identifier returned on match (e.g. a slug or row id). */
  id: string;
  /** The opening's signature FEN (the position after its defining moves). */
  fen: string;
};

/** Pre-built lookup; build once with {@link buildOpeningIndex}, reuse per game. */
export type OpeningIndex = {
  /** position-identity key → opening id. */
  byPositionKey: Map<string, string>;
  /** Deepest opening depth in plies — bounds how far a game is replayed. */
  maxPly: number;
};

export type OpeningMatch = {
  /** The matched opening's id. */
  id: string;
  /** 0-based game ply at which the opening's position was reached. */
  ply: number;
};

/**
 * Ply depth encoded by a full FEN's move counters: how many half-moves have
 * been played to reach it from the standard start. White-to-move at fullmove N
 * is 2·(N−1) plies; black-to-move adds one.
 */
function fenPlyDepth(fen: string): number {
  const parts = fen.split(" ");
  const side = parts[1];
  const fullmove = Number.parseInt(parts[5] ?? "1", 10) || 1;
  return (fullmove - 1) * 2 + (side === "b" ? 1 : 0);
}

/**
 * Build the position-key → id lookup once so it can be reused across many
 * games (e.g. when classifying a whole gallery page). `maxPly` is the deepest
 * opening's ply depth; games are only replayed that far, keeping detection
 * cheap regardless of game length.
 */
export function buildOpeningIndex(entries: OpeningEntry[]): OpeningIndex {
  const byPositionKey = new Map<string, string>();
  let maxPly = 0;
  for (const entry of entries) {
    // Last writer wins on the rare transposition collision; immaterial for a
    // curated set where signature positions are distinct.
    byPositionKey.set(toPositionKey(entry.fen), entry.id);
    const ply = fenPlyDepth(entry.fen);
    if (ply > maxPly) maxPly = ply;
  }
  return { byPositionKey, maxPly };
}

/**
 * Return the deepest opening the game reached, or null if none applies (custom
 * starting position, or no game position matches a known opening).
 */
export function detectOpening(
  game: { moves: string[]; startingFen?: string },
  index: OpeningIndex,
): OpeningMatch | null {
  // Openings are defined from the standard start; custom-position games get none.
  if (
    game.startingFen &&
    toPositionKey(game.startingFen) !== toPositionKey(getStartingFen())
  ) {
    return null;
  }

  // Only the opening phase can match a (shallow) opening position, so replaying
  // beyond the deepest known opening is wasted work even for long games.
  const limit = Math.min(game.moves.length, index.maxPly);
  const positions = replayMoves(game.moves.slice(0, limit), game.startingFen);

  let best: OpeningMatch | null = null;
  // positions[0] is the start (no opening); walk forward — deepest match wins.
  for (let ply = 1; ply < positions.length; ply += 1) {
    const id = index.byPositionKey.get(toPositionKey(positions[ply].fen));
    if (id !== undefined) best = { id, ply };
  }
  return best;
}

import { getTurnFromFen } from "./fen";
import { replayMoves } from "./moves";
import type { PgnTree } from "./pgn-tree";

/**
 * line-match: replay a finished game against a repertoire tree (型) and report
 * where — and how — the game left the prepared line.
 *
 * The asymmetry that makes this useful (and that PGN alone cannot express):
 *   - At the PLAYER's own turn, leaving the tree is a mistake to correct
 *     ("deviation") — they had prepared something and played otherwise.
 *   - At the OPPONENT's turn, a move not in the tree is not the player's fault;
 *     it is simply an unprepared line ("gap") — useful to surface, but as a
 *     hole in the repertoire rather than an error.
 *
 * Matching is by *resulting position* (the first four FEN fields — placement,
 * side to move, castling, en passant — ignoring the half/full-move clocks),
 * NOT by raw SAN. This is robust to check/mate-suffix differences and lets a
 * tree built from a non-standard `[FEN]` (a mate pattern, a middlegame study)
 * attach at whatever ply the game first reaches that position.
 */

export type Side = "white" | "black";

export type LineMatchStatus =
  /** Player left their own prepared line (a mistake to correct). */
  | "deviation"
  /** The line ran out because of an unprepared OPPONENT move (a repertoire hole). */
  | "gap"
  /** The game stayed on book until the book (or the game) ended — no deviation. */
  | "in-book"
  /** The game never reached this tree's root position; the tree does not apply. */
  | "not-applicable";

export type LineDivergence = {
  /** 0-based index into the game's move list where the divergence occurred. */
  ply: number;
  /** FEN of the position BEFORE the diverging move. */
  fen: string;
  /** Whose move diverged. */
  side: Side;
  /** SAN actually played in the game. */
  played: string;
  /** Prepared book move(s) available at this position. */
  expected: string[];
};

export type LineMatchResult = {
  status: LineMatchStatus;
  /** 0-based game ply at which the game first reached the tree's root, or null. */
  enteredAtPly: number | null;
  /** Number of plies the game followed on-book from {@link enteredAtPly}. */
  followedPlies: number;
  /** Present for "deviation" and "gap"; absent otherwise. */
  divergence?: LineDivergence;
};

export type GameForMatch = {
  /** Moves actually played, in SAN, from {@link startingFen}. */
  moves: string[];
  /** Which colour the repertoire owner played in this game. */
  playerColor: Side;
  /** Game's starting position; omit for the standard start. */
  startingFen?: string;
};

/** The position-identity key: the first four FEN fields (clocks dropped). */
function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

function sideToMove(fen: string): Side {
  return getTurnFromFen(fen) === "w" ? "white" : "black";
}

/**
 * Replay `game` against `tree` and classify the outcome.
 *
 * The walk begins at the earliest game position that equals the tree's root
 * (so opening trees attach at ply 0, and a mate-pattern tree attaches mid-game)
 * and follows on-book moves until either the book is exhausted, the game ends,
 * or a move diverges — at which point the player/opponent asymmetry decides
 * whether it is a "deviation" or a "gap".
 */
export function matchGameToLine(
  game: GameForMatch,
  tree: PgnTree,
): LineMatchResult {
  // positions[i] is the FEN *before* game move i; positions[0] is the start.
  // replayMoves stops at the first illegal move, so this may be shorter than
  // moves.length + 1 — every index access below is guarded.
  const positions = replayMoves(game.moves, game.startingFen).map((p) => p.fen);
  const rootKey = positionKey(tree.startingFen);

  let enteredAtPly: number | null = null;
  for (let i = 0; i < positions.length; i += 1) {
    if (positionKey(positions[i]) === rootKey) {
      enteredAtPly = i;
      break;
    }
  }
  if (enteredAtPly === null) {
    return { status: "not-applicable", enteredAtPly: null, followedPlies: 0 };
  }

  let children = tree.children;
  let p = enteredAtPly;
  let followedPlies = 0;

  for (;;) {
    // End of the prepared line, or the game itself ran out: stayed on book.
    if (children.length === 0 || p >= game.moves.length) {
      return { status: "in-book", enteredAtPly, followedPlies };
    }
    const beforeFen = positions[p];
    const afterFen = positions[p + 1];
    if (afterFen === undefined) {
      // Replay truncated before this move (illegal move in the saved game).
      return { status: "in-book", enteredAtPly, followedPlies };
    }

    const afterKey = positionKey(afterFen);
    const match = children.find((c) => positionKey(c.fen) === afterKey);
    if (match) {
      children = match.children;
      p += 1;
      followedPlies += 1;
      continue;
    }

    const side = sideToMove(beforeFen);
    const divergence: LineDivergence = {
      ply: p,
      fen: beforeFen,
      side,
      played: game.moves[p],
      expected: children.map((c) => c.san),
    };
    return {
      status: side === game.playerColor ? "deviation" : "gap",
      enteredAtPly,
      followedPlies,
      divergence,
    };
  }
}

export type LineMatchCandidate = {
  /** Index of the tree in the input array. */
  index: number;
  result: LineMatchResult;
};

/**
 * Run {@link matchGameToLine} against several trees (e.g. all of a user's lines
 * for the relevant colour) and return the results for the trees that actually
 * apply (i.e. whose root the game reached), in input order.
 *
 * Selecting a single "the line they meant to play" among several applicable
 * results is a product decision (deepest `followedPlies`? prefer a clean
 * `in-book` over a `deviation` in another line?), deliberately left to the
 * caller rather than baked into this pure core.
 */
export function matchGameAgainstLines(
  game: GameForMatch,
  trees: PgnTree[],
): LineMatchCandidate[] {
  return trees
    .map((tree, index) => ({ index, result: matchGameToLine(game, tree) }))
    .filter((c) => c.result.status !== "not-applicable");
}

import type { AlgebraicNotation } from "@blindfold-chess/types";
import { Chess, DEFAULT_POSITION } from "chess.js";

import { type Result, err, ok } from "../utils/result";
import { fullmoveNumberFromFen, isBlackToMoveFromFen } from "./fen-pure";
import { asEngineSan } from "./types";

/**
 * pgn-tree: parse a PGN *with variations (RAV)* into a move tree.
 *
 * Why this exists separately from `parsePgn`:
 *   `chess.js` `loadPgn()` keeps only the main line and silently discards
 *   variations. A repertoire / "型" is fundamentally a *tree* — at the
 *   player's own turn there is (usually) one committed move, but the
 *   opponent's replies branch. Throwing the variations away would collapse
 *   exactly the structure the repertoire is made of, so we parse the RAV
 *   ourselves and validate each move through `chess.js` from its own position.
 *
 * The tree is literal: transpositions are NOT merged here (two move orders
 * reaching the same position stay as distinct nodes). Position-level merging /
 * deviation matching is the consumer's job and keys on {@link MoveTreeNode.fen}.
 */

/**
 * A single move within the tree. `fen` is the position *after* `san` is played,
 * so a consumer can match a game's positions against the tree by FEN.
 */
export type MoveTreeNode = {
  /** Normalized SAN (as emitted by chess.js) of the move leading to this node. */
  san: AlgebraicNotation;
  /** FEN of the position AFTER this move has been played. */
  fen: string;
  /**
   * Continuations from this position. Multiple children are alternative
   * replies (e.g. the opponent's branching responses).
   */
  children: MoveTreeNode[];
};

export type PgnTree = {
  /**
   * The root position, *before* any move. The standard start unless the PGN
   * carries a non-default `[FEN "..."]` header (mate patterns / middlegame
   * studies start from an arbitrary position).
   */
  startingFen: string;
  /**
   * First moves from {@link startingFen}. Usually one; more than one only if
   * the PGN itself branches at the very first ply.
   */
  children: MoveTreeNode[];
};

/**
 * Why a PGN could not be parsed, in a form a UI can localize.
 *
 * `illegalMove` carries the offending SAN together with where it sits — the
 * fullmove number and the 1-based ply — because "this PGN is broken" is not
 * actionable on a 40-move line, whereas "move 8, ply 16" points straight at
 * the typo. The numbers are read off the position the move was rejected from,
 * so they stay correct inside variations and under a `[FEN]` root.
 */
export type PgnParseFailure =
  | { reason: "empty" }
  | { reason: "noMoves" }
  | { reason: "badFen" }
  | { reason: "danglingVariation" }
  | { reason: "illegalMove"; san: string; moveNumber: number; ply: number };

function describeFailure(failure: PgnParseFailure): string {
  switch (failure.reason) {
    case "empty":
      return "Invalid PGN: empty";
    case "noMoves":
      return "Invalid PGN: no moves found";
    case "badFen":
      return "Invalid PGN: bad FEN header";
    case "danglingVariation":
      return "Invalid PGN: variation with no preceding move";
    case "illegalMove":
      // Mirrors Lichess' analysis-board wording, so a PGN rejected here reads
      // the same as it does in the tool most authors paste from.
      return `Can't play ${failure.san} at move ${failure.moveNumber}, ply ${failure.ply}`;
  }
}

/**
 * A {@link PgnParseFailure} as an `Error`, for a caller that has to report the
 * failure through a throw or a log line rather than render it. It keeps the
 * structured failure alongside the English message, so a catch site can still
 * show the located, translated text instead of a bare "invalid PGN".
 * {@link parsePgnTree} itself never throws it — it returns the failure.
 */
export class PgnParseError extends Error {
  readonly failure: PgnParseFailure;

  constructor(failure: PgnParseFailure) {
    super(describeFailure(failure));
    this.name = "PgnParseError";
    this.failure = failure;
  }
}

/**
 * Locate a move by the position it is played from: the fullmove number as the
 * PGN writes it, and the 1-based ply counted from the game's first move.
 */
function locateMove(beforeFen: string): { moveNumber: number; ply: number } {
  const moveNumber = fullmoveNumberFromFen(beforeFen);
  const ply = (moveNumber - 1) * 2 + (isBlackToMoveFromFen(beforeFen) ? 2 : 1);
  return { moveNumber, ply };
}

const RESULT_MARKERS = new Set(["1-0", "0-1", "1/2-1/2", "*"]);

/** Read a non-default starting position from a `[FEN "..."]` header, if any. */
function extractStartingFen(pgn: string): string {
  const match = pgn.match(/\[FEN\s+"([^"]+)"\]/);
  if (match && match[1] && match[1] !== DEFAULT_POSITION) {
    return match[1];
  }
  return DEFAULT_POSITION;
}

/**
 * Reduce the movetext to a flat token stream where `(` and `)` are standalone
 * tokens. Headers, `{...}` / `;` comments and `$n` NAGs are dropped entirely —
 * dropping comments also sidesteps the chess.js adjacent-comment-block bug,
 * since we never hand them to chess.js.
 */
function tokenizeMovetext(pgn: string): string[] {
  const withoutHeaders = pgn
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("["))
    .join(" ");
  const cleaned = withoutHeaders
    .replace(/\{[^}]*\}/g, " ")
    .replace(/;[^\n]*/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/[()]/g, (paren) => ` ${paren} `);
  return cleaned.split(/\s+/).filter(Boolean);
}

/** Strip a leading move-number indicator ("12.", "1...") and trailing "!?" glyphs. */
function normalizeMoveToken(token: string): string {
  return token.replace(/^\d+\.+/, "").replace(/[!?]+$/, "");
}

/**
 * The movetext with its parentheses resolved into nesting: every `( ... )`
 * becomes one `variation` item holding its own items, so the line parser
 * never has to track where a variation ends.
 */
type LineItem =
  { kind: "token"; raw: string } | { kind: "variation"; items: LineItem[] };

/**
 * Group `tokens` from `start` into {@link LineItem}s until the `)` that closes
 * this level, returning the index just past it.
 *
 * Unbalanced input is accepted rather than rejected: a variation left open
 * runs to the end of the movetext, and a stray `)` at the top level ends the
 * movetext there (everything after it is ignored).
 */
function groupVariations(
  tokens: readonly string[],
  start: number,
): { items: LineItem[]; next: number } {
  const items: LineItem[] = [];
  let i = start;
  while (i < tokens.length) {
    const raw = tokens[i];
    if (raw === ")") return { items, next: i + 1 };
    if (raw === "(") {
      const variation = groupVariations(tokens, i + 1);
      items.push({ kind: "variation", items: variation.items });
      i = variation.next;
    } else {
      items.push({ kind: "token", raw });
      i += 1;
    }
  }
  return { items, next: i };
}

/**
 * One move of a line, together with the variations that replace it.
 *
 * A PGN variation is an alternative to the move it *follows*, so it branches
 * from `fenBefore` — the position this move was played from — and its first
 * move becomes a sibling of this one. `alternatives` holds those siblings
 * already built, in the order the variations appeared.
 */
type LineMove = {
  readonly san: AlgebraicNotation;
  /** Position before this move — where its alternatives branch from. */
  readonly fenBefore: string;
  /** Position after this move — where the line continues from. */
  readonly fen: string;
  readonly alternatives: readonly MoveTreeNode[];
};

/**
 * Everything the parser knows part-way through one line: the moves played so
 * far (each carrying its alternatives) and the position the next move is
 * played from. Each step function builds the next state from the previous one
 * in a single return, so no step can observe a state another step has only
 * partly updated.
 */
type LineState = {
  readonly moves: readonly LineMove[];
  /** Position the next move of this line is played from. */
  readonly fen: string;
};

type LineStep = Result<LineState, PgnParseFailure>;

/**
 * A move, move number or result marker. Move numbers ("12.", "3...") and
 * result markers leave the state as it is; a move must be legal from
 * `state.fen` and advances the line to the position after it.
 */
function stepToken(state: LineState, raw: string): LineStep {
  const san = normalizeMoveToken(raw);
  if (!san || RESULT_MARKERS.has(raw) || RESULT_MARKERS.has(san)) {
    return ok(state);
  }

  const chess = new Chess(state.fen);
  let played: ReturnType<Chess["move"]> | null;
  try {
    played = chess.move(san);
  } catch {
    played = null;
  }
  if (!played) {
    return err({ reason: "illegalMove", san, ...locateMove(state.fen) });
  }

  const move: LineMove = {
    san: asEngineSan(played.san),
    fenBefore: state.fen,
    fen: chess.fen(),
    alternatives: [],
  };
  return ok({ moves: [...state.moves, move], fen: move.fen });
}

/**
 * A `( ... )` variation: parsed from the position before the latest move and
 * added as alternatives to it. The line's own position is untouched, so the
 * moves after the `)` continue the line exactly where it left off.
 */
function stepVariation(state: LineState, items: readonly LineItem[]): LineStep {
  const latest = state.moves.at(-1);
  if (!latest) return err({ reason: "danglingVariation" });

  const variation = parseLine(latest.fenBefore, items);
  if (!variation.ok) return variation;

  const extended: LineMove = {
    ...latest,
    alternatives: [...latest.alternatives, ...variation.value],
  };
  return ok({ ...state, moves: [...state.moves.slice(0, -1), extended] });
}

function stepItem(state: LineState, item: LineItem): LineStep {
  return item.kind === "token"
    ? stepToken(state, item.raw)
    : stepVariation(state, item.items);
}

/**
 * Turn a line's moves into its tree: each move's node is followed by its
 * alternatives, and the next move's sibling list becomes its children.
 * Built from the last move backwards, so each node is created once with its
 * children already in hand.
 */
function buildLine(moves: readonly LineMove[]): MoveTreeNode[] {
  return moves.reduceRight<MoveTreeNode[]>(
    (children, move) => [
      { san: move.san, fen: move.fen, children },
      ...move.alternatives,
    ],
    [],
  );
}

/**
 * Parse one line from `beforeFen` into the sibling list rooted there: the
 * line's first move followed by the first moves of the variations that
 * replace it. Stops at the first failure, which is the first one in movetext
 * order since variations are parsed where they appear.
 */
function parseLine(
  beforeFen: string,
  items: readonly LineItem[],
): Result<MoveTreeNode[], PgnParseFailure> {
  const initial: LineStep = ok({ moves: [], fen: beforeFen });
  const final = items.reduce<LineStep>(
    (step, item) => (step.ok ? stepItem(step.value, item) : step),
    initial,
  );
  return final.ok ? ok(buildLine(final.value.moves)) : final;
}

/** Read the `[FEN]` root, or report why it is not a playable position. */
function readStartingFen(pgn: string): Result<string, PgnParseFailure> {
  const startingFen = extractStartingFen(pgn);
  if (startingFen === DEFAULT_POSITION) return ok(startingFen);
  try {
    // Construct only to validate the FEN; throws if the position is illegal.
    const probe = new Chess(startingFen);
    void probe;
  } catch {
    return err({ reason: "badFen" });
  }
  return ok(startingFen);
}

/**
 * Parse a PGN (with optional variations) into a {@link PgnTree}, or report the
 * located {@link PgnParseFailure}.
 *
 * A PGN reaching this function is user-typed or user-pasted text, so failing
 * to parse is an ordinary outcome, not an exception: the failure says *which*
 * move was illegal and where, and is returned as a value all the way from the
 * step that detected it. A throw out of here is a bug in the parser, not an
 * expected failure.
 */
export function parsePgnTree(pgn: string): Result<PgnTree, PgnParseFailure> {
  if (!pgn.trim()) return err({ reason: "empty" });

  const startingFen = readStartingFen(pgn);
  if (!startingFen.ok) return startingFen;

  const { items } = groupVariations(tokenizeMovetext(pgn), 0);
  const nodes = parseLine(startingFen.value, items);
  if (!nodes.ok) return nodes;
  if (nodes.value.length === 0) return err({ reason: "noMoves" });

  return ok({ startingFen: startingFen.value, children: nodes.value });
}

/**
 * Emit one move token from the position *before* it: `12. san` for White,
 * `12... san` for a Black move that opens a line / follows a variation block,
 * bare `san` for a Black move continuing an unbroken line.
 */
function writeMoveToken(
  san: string,
  beforeFen: string,
  needsNumber: boolean,
): string {
  const fullmove = fullmoveNumberFromFen(beforeFen);
  if (!isBlackToMoveFromFen(beforeFen)) return `${fullmove}. ${san}`;
  if (needsNumber) return `${fullmove}... ${san}`;
  return san;
}

/**
 * Serialize one sibling list as movetext: the first sibling is the line's
 * continuation, each further sibling becomes a `( ... )` variation branching
 * from the same position (standard RAV semantics — the inverse of
 * {@link parseLine}).
 */
function writeLine(
  siblings: MoveTreeNode[],
  beforeFen: string,
  opensLine: boolean,
): string {
  const parts: string[] = [];
  let nodes = siblings;
  let fen = beforeFen;
  let needsNumber = opensLine;

  while (nodes.length > 0) {
    const [main, ...variations] = nodes;
    parts.push(writeMoveToken(main.san, fen, needsNumber));
    for (const variation of variations) {
      parts.push(`(${writeLine([variation], fen, true)})`);
    }
    // After an interposed `( ... )` block a Black continuation must restate
    // its move number ("2... Nf6"), exactly as a line opener would.
    needsNumber = variations.length > 0;
    fen = main.fen;
    nodes = main.children;
  }

  return parts.join(" ");
}

/**
 * Serialize a {@link PgnTree} back to a PGN-with-variations string — the
 * inverse of {@link parsePgnTree}. The first child at every level is written
 * as the main line; every further child becomes a `( ... )` variation. A
 * non-standard root emits the `[SetUp]` / `[FEN]` headers so the round trip
 * preserves the starting position.
 *
 * Comments and NAGs are not represented in the tree, so a
 * parse → serialize round trip normalizes them away by construction.
 */
export function generatePgnFromTree(tree: PgnTree): string {
  const movetext = writeLine(tree.children, tree.startingFen, true);
  if (tree.startingFen === DEFAULT_POSITION) return movetext;
  return `[SetUp "1"]\n[FEN "${tree.startingFen}"]\n\n${movetext}`;
}

/**
 * Decompose a {@link PgnTree} into its individual *lines* — one SAN sequence
 * per root-to-leaf path. A repertoire imported as a single PGN-with-variations
 * is stored as N line rows; this is the decomposition that produces them.
 *
 * Example: `1. Nf3 d5 (1... Nc6 2. d4 d5 3. c4) (1... Nf6 2. b3 d5 3. Bb2) 2. g3 Nc6 3. d4`
 * yields 3 lines (main line + the two variations). Move order within each line
 * is preserved; the shared prefix (`1. Nf3`) is repeated in each.
 */
export function enumerateLines(tree: PgnTree): AlgebraicNotation[][] {
  const lines: AlgebraicNotation[][] = [];

  const walk = (nodes: MoveTreeNode[], prefix: AlgebraicNotation[]): void => {
    for (const node of nodes) {
      const path = [...prefix, node.san];
      if (node.children.length === 0) {
        lines.push(path);
      } else {
        walk(node.children, path);
      }
    }
  };
  walk(tree.children, []);

  return lines;
}

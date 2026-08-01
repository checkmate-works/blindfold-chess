import type { AlgebraicNotation } from "@blindfold-chess/types";
import { Chess, DEFAULT_POSITION } from "chess.js";

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
 * Thrown by {@link parsePgnTree}. Carries {@link PgnParseFailure} so callers can
 * render a located, translated message instead of a bare "invalid PGN".
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
  const fields = beforeFen.split(" ");
  const moveNumber = Number(fields[5] ?? "1") || 1;
  const ply = (moveNumber - 1) * 2 + (fields[1] === "w" ? 1 : 2);
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
 * Parse the moves of one line starting from `beforeFen`, recursing into each
 * `( ... )` as a set of *alternatives to the immediately preceding move*
 * (PGN variation semantics — a variation branches from the position before the
 * move it follows, so its first move is a sibling of that move).
 *
 * Returns the sibling list rooted at `beforeFen` and the index just past the
 * `)` that closed this line (or the end of the token stream at top level).
 */
function parseLine(
  beforeFen: string,
  tokens: string[],
  start: number,
): { nodes: MoveTreeNode[]; next: number } {
  const head: MoveTreeNode[] = [];
  let prevNode: MoveTreeNode | null = null;
  // The array `prevNode` lives in, so sibling variations attach next to it.
  let prevContainer: MoveTreeNode[] = head;
  // Position *before* `prevNode`'s move — the branch point for its variations.
  let fenBeforePrev = beforeFen;
  let currentFen = beforeFen;
  let i = start;

  while (i < tokens.length) {
    const raw = tokens[i];

    if (raw === ")") {
      return { nodes: head, next: i + 1 };
    }

    if (raw === "(") {
      if (!prevNode) {
        throw new PgnParseError({ reason: "danglingVariation" });
      }
      const variation = parseLine(fenBeforePrev, tokens, i + 1);
      for (const node of variation.nodes) {
        prevContainer.push(node);
      }
      i = variation.next;
      continue;
    }

    const san = normalizeMoveToken(raw);
    if (!san || RESULT_MARKERS.has(raw) || RESULT_MARKERS.has(san)) {
      i += 1;
      continue;
    }

    const chess = new Chess(currentFen);
    let result: ReturnType<Chess["move"]> | null = null;
    try {
      result = chess.move(san);
    } catch {
      result = null;
    }
    if (!result) {
      throw new PgnParseError({
        reason: "illegalMove",
        san,
        ...locateMove(currentFen),
      });
    }

    const node: MoveTreeNode = {
      san: result.san as AlgebraicNotation,
      fen: chess.fen(),
      children: [],
    };
    const container = prevNode ? prevNode.children : head;
    container.push(node);

    prevContainer = container;
    fenBeforePrev = currentFen;
    prevNode = node;
    currentFen = node.fen;
    i += 1;
  }

  return { nodes: head, next: i };
}

/**
 * Parse a PGN (with optional variations) into a {@link PgnTree}.
 *
 * @throws {PgnParseError} if the PGN is empty, has no moves, or contains an
 * illegal move — carrying the located {@link PgnParseFailure} so a form can say
 * *which* move failed rather than only that something did.
 */
export function parsePgnTree(pgn: string): PgnTree {
  if (!pgn.trim()) {
    throw new PgnParseError({ reason: "empty" });
  }

  const startingFen = extractStartingFen(pgn);
  if (startingFen !== DEFAULT_POSITION) {
    try {
      // Construct only to validate the FEN; throws if the position is illegal.
      const probe = new Chess(startingFen);
      void probe;
    } catch {
      throw new PgnParseError({ reason: "badFen" });
    }
  }

  const tokens = tokenizeMovetext(pgn);
  const { nodes } = parseLine(startingFen, tokens, 0);
  if (nodes.length === 0) {
    throw new PgnParseError({ reason: "noMoves" });
  }

  return { startingFen, children: nodes };
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
  const fields = beforeFen.split(" ");
  const turn = fields[1];
  const fullmove = fields[5] ?? "1";
  if (turn === "w") return `${fullmove}. ${san}`;
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

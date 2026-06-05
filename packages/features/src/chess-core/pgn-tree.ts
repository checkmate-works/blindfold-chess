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
        throw new Error("Invalid PGN: variation with no preceding move");
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
      throw new Error(`Invalid PGN: illegal move "${san}"`);
    }
    if (!result) {
      throw new Error(`Invalid PGN: illegal move "${san}"`);
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
 * @throws if the PGN is empty, has no moves, or contains an illegal move.
 */
export function parsePgnTree(pgn: string): PgnTree {
  if (!pgn.trim()) {
    throw new Error("Invalid PGN: empty");
  }

  const startingFen = extractStartingFen(pgn);
  if (startingFen !== DEFAULT_POSITION) {
    try {
      // Construct only to validate the FEN; throws if the position is illegal.
      const probe = new Chess(startingFen);
      void probe;
    } catch {
      throw new Error("Invalid PGN: bad FEN header");
    }
  }

  const tokens = tokenizeMovetext(pgn);
  const { nodes } = parseLine(startingFen, tokens, 0);
  if (nodes.length === 0) {
    throw new Error("Invalid PGN: no moves found");
  }

  return { startingFen, children: nodes };
}

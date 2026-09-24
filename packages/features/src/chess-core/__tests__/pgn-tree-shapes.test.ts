import { Chess, DEFAULT_POSITION } from "chess.js";
import { describe, expect, it } from "vitest";

import { generatePgnFromTree, parsePgnTree } from "../pgn-tree";
import type { MoveTreeNode, PgnParseFailure, PgnTree } from "../pgn-tree";
import { asEngineSan } from "../types";

/**
 * Exact-shape pinning for the RAV parser.
 *
 * The outcome-level tests in `pgn-tree.test.ts` check that particular moves
 * land somewhere sensible. These tests pin the *whole* tree, because the
 * failure mode of a variation parser is not an error but a subtly different
 * tree: a variation attached one level too deep, a continuation hung off the
 * variation's last move instead of the main line, or a branch validated from
 * the position after the move it replaces rather than the one before it.
 *
 * Shapes are written in a compact notation read left to right as a line:
 *
 *   `e4 e5 Nf3`            — a single chain, each move the only child of the last
 *   `e4 (e5 Nf3 | c5 Nc3)` — after e4 the tree branches; alternatives are
 *                            listed in tree order (main line first)
 *
 * A group can only close a chain, so the notation is unambiguous. SAN alone
 * does not pin a node, so every shape assertion is paired with
 * {@link expectConsistentFens}: each node's FEN must equal the position
 * reached by playing its SAN from its parent's FEN. Together they fix every
 * field of every node.
 */

/** Render a sibling list in the notation described above. */
function shapeOf(nodes: readonly MoveTreeNode[]): string {
  if (nodes.length === 0) return "";
  if (nodes.length > 1) {
    return `(${nodes.map((node) => shapeOf([node])).join(" | ")})`;
  }
  const [node] = nodes;
  const rest = shapeOf(node.children);
  return rest ? `${node.san} ${rest}` : node.san;
}

/**
 * Assert that every node's FEN is the position after its SAN is played from
 * the parent's position — the root's children from `startingFen`. Replayed
 * independently of the parser, so a branch attached to the wrong position
 * (or a FEN copied from the wrong node) fails here even when the SAN shape
 * happens to match.
 */
function expectConsistentFens(tree: PgnTree): void {
  const walk = (nodes: readonly MoveTreeNode[], beforeFen: string): void => {
    for (const node of nodes) {
      const chess = new Chess(beforeFen);
      const move = chess.move(node.san);
      expect(move.san).toBe(node.san);
      expect(node.fen).toBe(chess.fen());
      walk(node.children, node.fen);
    }
  };
  walk(tree.children, tree.startingFen);
}

function parseTree(pgn: string): PgnTree {
  const result = parsePgnTree(pgn);
  if (!result.ok) {
    throw new Error(
      `expected the PGN to parse: ${JSON.stringify(result.error)}`,
    );
  }
  return result.value;
}

function failureOf(pgn: string): PgnParseFailure {
  const result = parsePgnTree(pgn);
  if (result.ok) throw new Error("expected the PGN to fail parsing");
  return result.error;
}

type ShapeCase = { name: string; pgn: string; shape: string };

/**
 * Repertoire-style PGNs as a Lichess study or ChessBase export would produce
 * them. Grouped by the RAV structure each one exercises.
 */
const SHAPE_CASES: ShapeCase[] = [
  // ---- linear -------------------------------------------------------------
  {
    name: "linear line with spaced, glued and black move numbers",
    pgn: "1. e4 e5 2.Nf3 2... Nc6 3. Bb5",
    shape: "e4 e5 Nf3 Nc6 Bb5",
  },

  // ---- variation right after the first move ---------------------------------
  {
    name: "variation on White's first move",
    pgn: "1. e4 (1. d4 d5 2. c4) 1... e5 2. Nf3",
    shape: "(e4 e5 Nf3 | d4 d5 c4)",
  },
  {
    name: "variation on Black's first reply",
    pgn: "1. e4 e5 (1... c5 2. Nf3 d6) 2. Nf3",
    shape: "e4 (e5 Nf3 | c5 Nf3 d6)",
  },

  // ---- sibling variations ---------------------------------------------------
  {
    name: "several sibling variations on the same move",
    pgn: "1. e4 c5 (1... e5 2. Nf3) (1... e6 2. d4 d5) (1... c6 2. d4 d5) 2. Nf3 d6",
    shape: "e4 (c5 Nf3 d6 | e5 Nf3 | e6 d4 d5 | c6 d4 d5)",
  },
  {
    name: "sibling variations, then the main line branches again further on",
    pgn: "1. e4 e5 (1... c5) (1... e6) 2. Nf3 (2. Nc3 Nf6) 2... Nc6 (2... d6)",
    shape: "e4 (e5 (Nf3 (Nc6 | d6) | Nc3 Nf6) | c5 | e6)",
  },
  {
    name: "the same move repeated as its own alternative is kept, not merged",
    pgn: "1. e4 (1. e4 c5) 1... e5",
    shape: "(e4 e5 | e4 c5)",
  },

  // ---- nested variations ----------------------------------------------------
  {
    name: "nested variation inside a black-reply variation (Ruy Lopez)",
    pgn:
      "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 " +
      "(3... Nf6 4. O-O Nxe4 (4... Bc5 5. c3) 5. d4) " +
      "4. Ba4 Nf6 5. O-O",
    shape: "e4 e5 Nf3 Nc6 Bb5 (a6 Ba4 Nf6 O-O | Nf6 O-O (Nxe4 d4 | Bc5 c3))",
  },
  {
    name: "variation three levels deep (Queen's Gambit)",
    pgn:
      "1. d4 d5 2. c4 e6 " +
      "(2... c6 3. Nf3 Nf6 (3... e6 4. Nc3 (4. e3 Nd7) 4... dxc4) 4. Nc3) " +
      "3. Nc3",
    shape: "d4 d5 c4 (e6 Nc3 | c6 Nf3 (Nf6 Nc3 | e6 (Nc3 dxc4 | e3 Nd7)))",
  },
  {
    name: "nested variation on a variation's own first move flattens to a sibling",
    // (2. c3 d5) is an alternative to 2. Nc3, which is itself an alternative
    // to 2. Nf3 — so all three are siblings from the position after 1... c5.
    pgn: "1. e4 c5 2. Nf3 (2. Nc3 (2. c3 d5) Nc6) d6",
    shape: "e4 c5 (Nf3 d6 | Nc3 Nc6 | c3 d5)",
  },
  {
    name: "variation opened immediately after a closed one keeps the branch point",
    pgn: "1. d4 Nf6 2. c4 g6 (2... e6 3. Nf3 (3. Nc3 Bb4)) (2... c5 3. d5) 3. Nc3",
    shape: "d4 Nf6 c4 (g6 Nc3 | e6 (Nf3 | Nc3 Bb4) | c5 d5)",
  },

  // ---- noise interleaved with the moves ---------------------------------------
  {
    name: "comments, NAGs, glyphs and move numbers around every token",
    pgn:
      '[Event "Repertoire"]\n[Site "?"]\n\n' +
      "1. e4 {best by test} 1... e5 $1 2. Nf3 {the king's knight (always)}\n" +
      "2... Nc6!? (2... d6 {Philidor} $6 3. d4 {(3. Bc4 is also fine)}) " +
      "3. Bb5 $10 { [%eval 0.3] } { [%clk 0:05:00] } 3... a6?! 4. Ba4",
    shape: "e4 e5 Nf3 (Nc6 Bb5 a6 Ba4 | d6 d4)",
  },
  {
    name: "a comment directly between a move and its variation",
    pgn: "1. d4 d5 2. c4 {Queen's Gambit} (2. Nf3 {quiet} Nf6) 2... e6",
    shape: "d4 d5 (c4 e6 | Nf3 Nf6)",
  },

  {
    name: "a ';' comment runs to the end of the movetext, not the end of its line",
    // `tokenizeMovetext` joins the lines (to drop the header lines) before it
    // strips comments, so by the time the `;` pattern runs there is no newline
    // left to stop it and everything after the `;` is discarded. Pinned as the
    // current behaviour; fixing the tokenizer changes this expectation.
    pgn: "1. e4 e5 ; open game\n2. Nf3 Nc6",
    shape: "e4 e5",
  },

  // ---- result markers ---------------------------------------------------------
  {
    name: "result markers at the end of the game and inside a variation",
    pgn: "1. e4 e5 (1... c5 *) 2. Nf3 1/2-1/2",
    shape: "e4 (e5 Nf3 | c5)",
  },
  {
    name: "decisive result markers are dropped too",
    pgn: "1. f3 e5 2. g4 Qh4# 0-1",
    shape: "f3 e5 g4 Qh4#",
  },

  // ---- lenient inputs the parser accepts as-is ------------------------------------
  {
    name: "an empty variation contributes nothing",
    pgn: "1. e4 () 1... e5",
    shape: "e4 e5",
  },
  {
    name: "an unclosed variation runs to the end of the movetext",
    pgn: "1. e4 e5 (1... c5 2. Nf3",
    shape: "e4 (e5 | c5 Nf3)",
  },
  {
    name: "a stray top-level ')' ends the movetext",
    pgn: "1. e4 e5 ) 2. Nf3",
    shape: "e4 e5",
  },
];

describe("parsePgnTree — exact tree shapes", () => {
  it.each(SHAPE_CASES)("$name", ({ pgn, shape }) => {
    const tree = parseTree(pgn);
    expect(tree.startingFen).toBe(DEFAULT_POSITION);
    expect(shapeOf(tree.children)).toBe(shape);
    expectConsistentFens(tree);
  });

  it("branches a custom-[FEN] study from the header position", () => {
    const fen = "4k3/8/4K3/8/8/8/8/R7 w - - 0 1";
    const tree = parseTree(
      `[SetUp "1"]\n[FEN "${fen}"]\n\n1. Ra8# (1. Ra7 Kf8 2. Ra8+)`,
    );
    expect(tree.startingFen).toBe(fen);
    expect(shapeOf(tree.children)).toBe("(Ra8# | Ra7 Kf8 Ra8+)");
    expectConsistentFens(tree);
  });

  it("stores the literal FEN after a variation's first move, not the main move's", () => {
    // The spot check the consistency walk would also catch, written out so a
    // failure reads as a position rather than a replay mismatch.
    const tree = parseTree("1. e4 (1. d4) 1... e5");
    const [e4, d4] = tree.children;
    expect(e4.fen).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    );
    expect(d4.fen).toBe(
      "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1",
    );
    expect(d4.children).toEqual([]);
    expect(e4.children.map((node) => node.san)).toEqual(["e5"]);
  });
});

// ============================================================
// errors, with their location
// ============================================================

type FailureCase = { name: string; pgn: string; failure: PgnParseFailure };

const FAILURE_CASES: FailureCase[] = [
  {
    name: "a variation before any move",
    pgn: "(1. d4) 1. e4",
    failure: { reason: "danglingVariation" },
  },
  {
    name: "a variation opening a variation",
    pgn: "1. e4 ((1. d4)) 1... e5",
    failure: { reason: "danglingVariation" },
  },
  {
    name: "a variation opening a nested variation",
    pgn: "1. e4 e5 (1... c5 2. Nf3 ((2. Nc3))) 2. Nf3",
    failure: { reason: "danglingVariation" },
  },
  {
    name: "a variation move checked against the position before its sibling",
    // 1... e4 would be legal for nobody here: Black's e-pawn cannot jump to e4.
    pgn: "1. e4 e5 (1... e4)",
    failure: { reason: "illegalMove", san: "e4", moveNumber: 1, ply: 2 },
  },
  {
    name: "an illegal move two variations deep",
    // After 2... c6 3. Nc3 the f8 bishop is still shut in by e7.
    pgn: "1. d4 d5 2. c4 e6 (2... c6 3. Nf3 (3. Nc3 Bb4) Nf6) 3. Nc3",
    failure: { reason: "illegalMove", san: "Bb4", moveNumber: 3, ply: 6 },
  },
  {
    name: "the main line resumes from its own position after a variation",
    // 2. c5 would be fine for Black inside the variation; for White after
    // 1... e5 there is no pawn that can reach c5.
    pgn: "1. e4 e5 (1... c5) 2. c5",
    failure: { reason: "illegalMove", san: "c5", moveNumber: 2, ply: 3 },
  },
  {
    name: "a move continuing a variation checked from the variation's position",
    // Inside (1... c5 ...) White's 2. Nf3 is legal; 2... Nf3 is Black's and not.
    pgn: "1. e4 e5 (1... c5 2. Nf3 Nf3) 2. Nf3",
    failure: { reason: "illegalMove", san: "Nf3", moveNumber: 2, ply: 4 },
  },
  {
    name: "the first failure in token order wins",
    pgn: "1. e4 e5 2. Ke3 (2. Nf3) (",
    failure: { reason: "illegalMove", san: "Ke3", moveNumber: 2, ply: 3 },
  },
  {
    name: "a stripped glyph does not leak into the reported SAN",
    pgn: "1. e4 e5 2. Qh5 Qxh5?? 3. Qxf7#",
    failure: { reason: "illegalMove", san: "Qxh5", moveNumber: 2, ply: 4 },
  },
];

describe("parsePgnTree — located failures", () => {
  it.each(FAILURE_CASES)("$name", ({ pgn, failure }) => {
    expect(failureOf(pgn)).toEqual(failure);
  });
});

// ============================================================
// round trip: parse → serialize → parse
// ============================================================

/** Small seeded PRNG (mulberry32) so a failing tree reproduces exactly. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a random tree of legal moves: at each position pick up to
 * `maxBranching` distinct legal moves (the first continues the line, the rest
 * become variations), down to `depth` plies.
 */
function randomTree(
  random: () => number,
  startingFen: string,
  depth: number,
  maxBranching: number,
): PgnTree {
  const grow = (fen: string, plies: number): MoveTreeNode[] => {
    if (plies === 0) return [];
    const chess = new Chess(fen);
    const legal = chess.moves();
    if (legal.length === 0) return [];
    const width = 1 + Math.floor(random() * maxBranching);
    const picked = new Set<string>();
    while (picked.size < Math.min(width, legal.length)) {
      picked.add(legal[Math.floor(random() * legal.length)]);
    }
    return [...picked].map((san) => {
      const next = new Chess(fen);
      next.move(san);
      const nextFen = next.fen();
      // Branch less the deeper we go, or the tree explodes.
      return {
        san: asEngineSan(san),
        fen: nextFen,
        children: grow(nextFen, random() < 0.8 ? plies - 1 : 0),
      };
    });
  };
  return { startingFen, children: grow(startingFen, depth) };
}

describe("parsePgnTree ∘ generatePgnFromTree", () => {
  it.each(SHAPE_CASES)("round-trips the fixture tree: $name", ({ pgn }) => {
    const tree = parseTree(pgn);
    const reparsed = parseTree(generatePgnFromTree(tree));
    expect(reparsed).toEqual(tree);
  });

  it("round-trips randomly generated trees exactly", () => {
    const blackToMove =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    for (let seed = 1; seed <= 60; seed += 1) {
      const random = seededRandom(seed);
      const root = seed % 3 === 0 ? blackToMove : DEFAULT_POSITION;
      const tree = randomTree(random, root, 7, 3);
      const pgn = generatePgnFromTree(tree);
      const reparsed = parsePgnTree(pgn);
      expect(reparsed, `seed ${seed}: ${pgn}`).toEqual({
        ok: true,
        value: tree,
      });
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  PgnParseError,
  enumerateLines,
  generatePgnFromTree,
  parsePgnTree,
} from "../pgn-tree";
import type { MoveTreeNode, PgnParseFailure } from "../pgn-tree";

const STANDARD_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Collect the SAN of every node, depth-first, for terse assertions. */
function sans(nodes: MoveTreeNode[]): string[] {
  return nodes.flatMap((n) => [n.san, ...sans(n.children)]);
}

/** Walk the single main line (first child at each level) as SAN. */
function mainLine(nodes: MoveTreeNode[]): string[] {
  const out: string[] = [];
  let level = nodes;
  while (level.length > 0) {
    out.push(level[0].san);
    level = level[0].children;
  }
  return out;
}

// ============================================================
// linear PGN (no variations)
// ============================================================
describe("parsePgnTree — linear", () => {
  it("builds a single chain for a variation-free PGN", () => {
    const tree = parsePgnTree("1. e4 e5 2. Nf3 Nc6");
    expect(tree.startingFen).toBe(STANDARD_FEN);
    expect(mainLine(tree.children)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    // Each node has at most one child on a linear line.
    expect(sans(tree.children)).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("stores the FEN after each move", () => {
    const tree = parsePgnTree("1. e4 e5");
    const e4 = tree.children[0];
    expect(e4.san).toBe("e4");
    expect(e4.fen).toContain("PPPP1PPP/RNBQKBNR b");
    const e5 = e4.children[0];
    expect(e5.fen).toContain(" w ");
  });

  it("ignores result markers", () => {
    const tree = parsePgnTree("1. e4 e5 1-0");
    expect(mainLine(tree.children)).toEqual(["e4", "e5"]);
  });

  it("handles a single move", () => {
    const tree = parsePgnTree("1. e4");
    expect(sans(tree.children)).toEqual(["e4"]);
  });
});

// ============================================================
// variations (RAV) — the whole point of this module
// ============================================================
describe("parsePgnTree — variations", () => {
  it("attaches a variation as a sibling of the move it follows", () => {
    // 2... b6 is the main reply; (2... Nf6 ...) is an alternative reply.
    const tree = parsePgnTree("1. d4 d5 2. Nd2 b6 (2... Nf6 3. e4 e5) 3. Ngf3");

    // Find the node after 1.d4 d5 2.Nd2 — it should have two children: b6, Nf6.
    const d4 = tree.children[0];
    const d5 = d4.children[0];
    const nd2 = d5.children[0];
    expect(nd2.san).toBe("Nd2");
    expect(nd2.children.map((c) => c.san).sort()).toEqual(["Nf6", "b6"]);

    // Main line continues under b6 with 3. Ngf3.
    const b6 = nd2.children.find((c) => c.san === "b6")!;
    expect(b6.children.map((c) => c.san)).toEqual(["Ngf3"]);

    // The variation under Nf6 carries its own continuation 3. e4 e5.
    const nf6 = nd2.children.find((c) => c.san === "Nf6")!;
    expect(mainLine([nf6])).toEqual(["Nf6", "e4", "e5"]);
  });

  it("supports a variation on the very first move", () => {
    const tree = parsePgnTree("1. e4 (1. d4 d5) e5");
    expect(tree.children.map((c) => c.san).sort()).toEqual(["d4", "e4"]);
    const d4 = tree.children.find((c) => c.san === "d4")!;
    expect(mainLine([d4])).toEqual(["d4", "d5"]);
    const e4 = tree.children.find((c) => c.san === "e4")!;
    expect(e4.children.map((c) => c.san)).toEqual(["e5"]);
  });

  it("handles nested variations", () => {
    const tree = parsePgnTree("1. e4 c5 2. Nf3 (2. Nc3 (2. c3 d5) Nc6) d6");
    const e4 = tree.children[0];
    const c5 = e4.children[0];
    // White's 2nd move branches three ways from the position after 1.e4 c5:
    // Nf3 (main), Nc3 (alt), and c3 (alt nested inside the Nc3 variation).
    expect(c5.children.map((c) => c.san).sort()).toEqual(["Nc3", "Nf3", "c3"]);
    // The deeply nested variation (2. c3 d5) carries its own continuation.
    const c3 = c5.children.find((c) => c.san === "c3")!;
    expect(mainLine([c3])).toEqual(["c3", "d5"]);
    // Nc3's own continuation Nc6 sits under Nc3.
    const nc3 = c5.children.find((c) => c.san === "Nc3")!;
    expect(nc3.children.map((c) => c.san)).toEqual(["Nc6"]);
    // The main line resumes after Nf3 with 3... d6.
    const nf3 = c5.children.find((c) => c.san === "Nf3")!;
    expect(nf3.children.map((c) => c.san)).toEqual(["d6"]);
  });

  it("supports two consecutive variations on the same move", () => {
    const tree = parsePgnTree("1. e4 e5 (1... c5) (1... e6) 2. Nf3");
    const e4 = tree.children[0];
    expect(e4.children.map((c) => c.san).sort()).toEqual(["c5", "e5", "e6"]);
  });
});

// ============================================================
// custom starting position
// ============================================================
describe("parsePgnTree — custom FEN", () => {
  it("uses a non-default FEN header as the root", () => {
    const fen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
    const tree = parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. a8=Q+ Kd7`);
    expect(tree.startingFen).toBe(fen);
    expect(mainLine(tree.children)).toEqual(["a8=Q+", "Kd7"]);
  });

  it("treats the default FEN header as the standard start", () => {
    const tree = parsePgnTree(`[FEN "${STANDARD_FEN}"]\n\n1. e4`);
    expect(tree.startingFen).toBe(STANDARD_FEN);
  });
});

// ============================================================
// noise: comments, NAGs, annotation glyphs
// ============================================================
describe("parsePgnTree — noise stripping", () => {
  it("strips comments, NAGs and !? glyphs (incl. adjacent comment blocks)", () => {
    const pgn =
      '[White "a"]\n[Black "b"]\n\n' +
      "1. d4 { [%eval 0.15] } 1... d5 2. Nd2 b6? { (0.13 → 1.56) Mistake. } " +
      "{ [%eval 1.56] } $2 (2... Nf6 3. e4 e5) 3. Ngf3 1-0";
    const tree = parsePgnTree(pgn);
    expect(mainLine(tree.children)).toEqual(["d4", "d5", "Nd2", "b6", "Ngf3"]);
    // The "?" glyph on b6 must not leak into the stored SAN.
    expect(sans(tree.children)).toContain("b6");
    expect(sans(tree.children)).not.toContain("b6?");
  });

  it("handles glued move numbers (e.g. '1.e4')", () => {
    const tree = parsePgnTree("1.e4 e5 2.Nf3");
    expect(mainLine(tree.children)).toEqual(["e4", "e5", "Nf3"]);
  });
});

// ============================================================
// enumerateLines
// ============================================================
describe("enumerateLines", () => {
  it("returns a single line for a variation-free PGN", () => {
    const tree = parsePgnTree("1. e4 e5 2. Nf3 Nc6");
    expect(enumerateLines(tree)).toEqual([["e4", "e5", "Nf3", "Nc6"]]);
  });

  it("decomposes the main line plus each variation into separate lines", () => {
    const tree = parsePgnTree(
      "1. Nf3 d5 (1... Nc6 2. d4 d5 3. c4) (1... Nf6 2. b3 d5 3. Bb2) 2. g3 Nc6 3. d4",
    );
    const lines = enumerateLines(tree);
    expect(lines).toHaveLength(3);
    expect(lines).toContainEqual(["Nf3", "d5", "g3", "Nc6", "d4"]);
    expect(lines).toContainEqual(["Nf3", "Nc6", "d4", "d5", "c4"]);
    expect(lines).toContainEqual(["Nf3", "Nf6", "b3", "d5", "Bb2"]);
  });

  it("repeats the shared prefix in each line", () => {
    const tree = parsePgnTree("1. e4 e5 (1... c5) (1... e6)");
    const lines = enumerateLines(tree);
    expect(lines).toHaveLength(3);
    // Every line starts from the shared 1. e4.
    expect(lines.every((l) => l[0] === "e4")).toBe(true);
    expect(lines.map((l) => l[1]).sort()).toEqual(["c5", "e5", "e6"]);
  });

  it("handles a custom-FEN root", () => {
    const fen = "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1";
    const tree = parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. Rd8#`);
    expect(enumerateLines(tree)).toEqual([["Rd8#"]]);
  });
});

// ============================================================
// generatePgnFromTree — the inverse of parsePgnTree
// ============================================================
describe("generatePgnFromTree", () => {
  it("emits numbered movetext for a linear tree", () => {
    const tree = parsePgnTree("1. e4 e5 2. Nf3 Nc6");
    expect(generatePgnFromTree(tree)).toBe("1. e4 e5 2. Nf3 Nc6");
  });

  it("emits variations in parens, numbering the black branch opener", () => {
    const pgn = "1. e4 e5 (1... c5 2. Nf3) 2. Nf3";
    expect(generatePgnFromTree(parsePgnTree(pgn))).toBe(pgn);
  });

  it("restates the move number for a black reply after a variation block", () => {
    const pgn = "1. d4 d5 2. Nd2 (2. Nf3 Nf6) 2... b6 3. Ngf3";
    expect(generatePgnFromTree(parsePgnTree(pgn))).toBe(pgn);
  });

  it("emits consecutive variations on the same move", () => {
    const pgn = "1. e4 e5 (1... c5) (1... e6) 2. Nf3";
    expect(generatePgnFromTree(parsePgnTree(pgn))).toBe(pgn);
  });

  it("emits nested variations flattened to siblings of the same branch point", () => {
    // parsePgnTree attaches a nested variation as another sibling of the move
    // it branches from (2. c3 is a third alternative to 2. Nf3, not a child of
    // 2. Nc3), so the serialized form lists the alternatives consecutively.
    // The line set is identical — see the round-trip test below.
    const pgn = "1. e4 c5 2. Nf3 (2. Nc3 (2. c3 d5) Nc6) 2... d6";
    expect(generatePgnFromTree(parsePgnTree(pgn))).toBe(
      "1. e4 c5 2. Nf3 (2. Nc3 Nc6) (2. c3 d5) 2... d6",
    );
  });

  it("emits a variation on the very first move", () => {
    const pgn = "1. e4 (1. d4 d5) 1... e5";
    expect(generatePgnFromTree(parsePgnTree(pgn))).toBe(pgn);
  });

  it("carries a non-standard root as SetUp/FEN headers", () => {
    const fen = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1";
    const tree = parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. a8=Q+ Kd7`);
    const pgn = generatePgnFromTree(tree);
    expect(pgn).toBe(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. a8=Q+ Kd7`);
    // And the headers survive a re-parse.
    expect(parsePgnTree(pgn).startingFen).toBe(fen);
  });

  it("numbers a black first move from a black-to-move root", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const tree = parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n1... e5 2. Nf3`);
    expect(generatePgnFromTree(tree)).toBe(
      `[SetUp "1"]\n[FEN "${fen}"]\n\n1... e5 2. Nf3`,
    );
  });

  it("round-trips: parse(generate(tree)) preserves every line", () => {
    const pgns = [
      "1. e4 e5 2. Nf3 Nc6",
      "1. Nf3 d5 (1... Nc6 2. d4 d5 3. c4) (1... Nf6 2. b3 d5 3. Bb2) 2. g3 Nc6 3. d4",
      "1. e4 c5 2. Nf3 (2. Nc3 (2. c3 d5) Nc6) d6",
      "1. e4 (1. d4 d5) e5",
    ];
    for (const pgn of pgns) {
      const tree = parsePgnTree(pgn);
      const reparsed = parsePgnTree(generatePgnFromTree(tree));
      expect(enumerateLines(reparsed)).toEqual(enumerateLines(tree));
    }
  });
});

// ============================================================
// error cases
// ============================================================
describe("parsePgnTree — errors", () => {
  it("throws on empty input", () => {
    expect(() => parsePgnTree("")).toThrow("Invalid PGN: empty");
    expect(() => parsePgnTree("   ")).toThrow("Invalid PGN: empty");
  });

  it("throws when there are no moves", () => {
    expect(() => parsePgnTree('[Event "x"]\n\n*')).toThrow(
      "Invalid PGN: no moves found",
    );
  });

  it("throws on an illegal move", () => {
    expect(() => parsePgnTree("1. e4 e5 2. Bf8")).toThrow(
      "Can't play Bf8 at move 2, ply 3",
    );
  });

  it("throws on an illegal move inside a variation", () => {
    expect(() => parsePgnTree("1. e4 e5 (1... Ke7) 2. Nf3")).toThrow(
      "Can't play Ke7 at move 1, ply 2",
    );
  });

  it("locates the offending move by fullmove number and ply", () => {
    // 8. Bxa8 is legal; the "d7" that follows it is not a move at all.
    const pgn =
      "1. Nf3 d5 2. g3 d4 3. c3 dxc3 4. bxc3 Nc6 5. Bg2 e6 6. d4 b6 7. Ne5 Nxe5 8. Bxa8 d7 9. Bg2 Ng6";
    let failure: PgnParseFailure | null = null;
    try {
      parsePgnTree(pgn);
    } catch (error) {
      failure = error instanceof PgnParseError ? error.failure : null;
    }
    expect(failure).toEqual({
      reason: "illegalMove",
      san: "d7",
      moveNumber: 8,
      ply: 16,
    });
  });

  it("numbers plies from a non-standard [FEN] root", () => {
    const pgn =
      '[SetUp "1"]\n[FEN "8/8/8/4k3/8/8/4K3/8 w - - 0 20"]\n\n20. Qd4';
    let failure: PgnParseFailure | null = null;
    try {
      parsePgnTree(pgn);
    } catch (error) {
      failure = error instanceof PgnParseError ? error.failure : null;
    }
    expect(failure).toEqual({
      reason: "illegalMove",
      san: "Qd4",
      moveNumber: 20,
      ply: 39,
    });
  });
});

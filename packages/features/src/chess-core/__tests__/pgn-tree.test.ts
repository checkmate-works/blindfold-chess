import { describe, expect, it } from "vitest";

import { parsePgnTree } from "../pgn-tree";
import type { MoveTreeNode } from "../pgn-tree";

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
    expect(() => parsePgnTree("1. e4 e5 2. Bf8")).toThrow(/illegal move/);
  });

  it("throws on an illegal move inside a variation", () => {
    expect(() => parsePgnTree("1. e4 e5 (1... Ke7) 2. Nf3")).toThrow(
      /illegal move/,
    );
  });
});

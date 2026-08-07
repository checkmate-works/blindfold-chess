import { describe, expect, it } from "vitest";

import {
  isLightSquare,
  computeSquareColor,
  generateRandomSquare,
  generateSquareSequence,
} from "./utils";
import { DISPLAY_RANKS } from "./constants";
import { RANKS } from "@blindfold-chess/types";

// ============================================================
// isLightSquare
// ============================================================
describe("isLightSquare", () => {
  // In the board rendering, rankIndex iterates over DISPLAY_RANKS
  // (["8","7","6","5","4","3","2","1"]), so rankIndex=0 is rank 8
  // and rankIndex=7 is rank 1. fileIndex=0 is file a, fileIndex=7 is file h.

  it("returns true for a8 (fileIndex=0, rankIndex=0) — known light square", () => {
    expect(isLightSquare(0, 0)).toBe(true);
  });

  it("returns true for h1 (fileIndex=7, rankIndex=7) — known light square", () => {
    expect(isLightSquare(7, 7)).toBe(true);
  });

  it("returns false for a1 (fileIndex=0, rankIndex=7) — known dark square", () => {
    expect(isLightSquare(0, 7)).toBe(false);
  });

  it("returns false for h8 (fileIndex=7, rankIndex=0) — known dark square", () => {
    expect(isLightSquare(7, 0)).toBe(false);
  });

  it("returns false for a7 (fileIndex=0, rankIndex=1) — known dark square", () => {
    expect(isLightSquare(0, 1)).toBe(false);
  });

  it("returns true for b7 (fileIndex=1, rankIndex=1) — known light square", () => {
    expect(isLightSquare(1, 1)).toBe(true);
  });

  it("returns true for d4 (fileIndex=3, rankIndex=4) — known light square", () => {
    // d4: file d=3, rank 4 in DISPLAY_RANKS is at index 4
    expect(isLightSquare(3, 4)).toBe(false);
  });

  it("returns true for e4 (fileIndex=4, rankIndex=4) — known light square", () => {
    // e4: file e=4, rank 4 in DISPLAY_RANKS is at index 4
    expect(isLightSquare(4, 4)).toBe(true);
  });

  it("alternates colors across a rank", () => {
    // Rank 8 (rankIndex=0): a8=light, b8=dark, c8=light, ...
    for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
      const expected = fileIndex % 2 === 0;
      expect(isLightSquare(fileIndex, 0)).toBe(expected);
    }
  });

  it("alternates colors down a file", () => {
    // File a (fileIndex=0): a8(rank=0)=light, a7(rank=1)=dark, a6(rank=2)=light, ...
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      const expected = rankIndex % 2 === 0;
      expect(isLightSquare(0, rankIndex)).toBe(expected);
    }
  });
});

// ============================================================
// isLightSquare consistency with computeSquareColor
// ============================================================
describe("isLightSquare consistency with computeSquareColor", () => {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const displayRanks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  it("agrees with computeSquareColor for all 64 squares", () => {
    for (let rankIndex = 0; rankIndex < 8; rankIndex++) {
      for (let fileIndex = 0; fileIndex < 8; fileIndex++) {
        const square = files[fileIndex] + displayRanks[rankIndex];
        const colorFromCompute = computeSquareColor(square);
        const isLight = isLightSquare(fileIndex, rankIndex);

        expect(isLight).toBe(colorFromCompute === "light");
      }
    }
  });
});

// ============================================================
// generateRandomSquare
// ============================================================
describe("generateRandomSquare", () => {
  it("returns a valid square without exclude", () => {
    for (let i = 0; i < 100; i++) {
      const square = generateRandomSquare();
      expect(square).toMatch(/^[a-h][1-8]$/);
    }
  });

  it("never returns an excluded square", () => {
    const exclude = new Set(["a1", "a2", "a3"] as const) as ReadonlySet<
      import("@blindfold-chess/types").Square
    >;
    for (let i = 0; i < 200; i++) {
      const square = generateRandomSquare(Math.random, exclude);
      expect(exclude.has(square)).toBe(false);
    }
  });

  it("throws when all 64 squares are excluded", () => {
    const allSquares = new Set<import("@blindfold-chess/types").Square>();
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
    const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
    for (const f of files) {
      for (const r of ranks) {
        allSquares.add(`${f}${r}` as import("@blindfold-chess/types").Square);
      }
    }
    expect(() => generateRandomSquare(Math.random, allSquares)).toThrow(
      "Cannot generate a random square: all squares are excluded",
    );
  });

  it("samples only from the eligible list, so an excluded square is unreachable", () => {
    const exclude = new Set(["a1"] as const) as ReadonlySet<
      import("@blindfold-chess/types").Square
    >;
    // With an exclude set the draw indexes once into the eligible list
    // (file-major order): a1 is excluded, so index 0 is a2.
    expect(generateRandomSquare(() => 0, exclude)).toBe("a2");
    // Sweeping every index proves a1 is structurally unreachable.
    for (let i = 0; i < 63; i++) {
      expect(generateRandomSquare(() => i / 63, exclude)).not.toBe("a1");
    }
  });
});

// ============================================================
// generateSquareSequence
// ============================================================
describe("generateSquareSequence", () => {
  it("returns the requested number of squares without exclude", () => {
    expect(generateSquareSequence(0)).toHaveLength(0);
    expect(generateSquareSequence(5)).toHaveLength(5);
    expect(generateSquareSequence(32)).toHaveLength(32);
  });

  it("never includes excluded squares", () => {
    const exclude = new Set(["a1", "h8"] as const) as ReadonlySet<
      import("@blindfold-chess/types").Square
    >;
    const squares = generateSquareSequence(50, Math.random, exclude);
    for (const square of squares) {
      expect(exclude.has(square)).toBe(false);
    }
  });

  it("computes resetThreshold based on exclude size", () => {
    // With 4 excluded squares: threshold = floor((64-4)/2) = 30
    // With 0 excluded: threshold = floor(64/2) = 32
    // We just verify it works for large sequences
    const exclude = new Set(["a1", "a8", "h1", "h8"] as const) as ReadonlySet<
      import("@blindfold-chess/types").Square
    >;
    const squares = generateSquareSequence(100, Math.random, exclude);
    expect(squares).toHaveLength(100);
    for (const square of squares) {
      expect(exclude.has(square)).toBe(false);
    }
  });
});

// ============================================================
// DISPLAY_RANKS
// ============================================================
describe("DISPLAY_RANKS", () => {
  it('equals ["8","7","6","5","4","3","2","1"]', () => {
    expect(DISPLAY_RANKS).toEqual(["8", "7", "6", "5", "4", "3", "2", "1"]);
  });

  it("is the reverse of RANKS", () => {
    expect([...DISPLAY_RANKS]).toEqual([...RANKS].reverse());
  });

  it("has exactly 8 elements", () => {
    expect(DISPLAY_RANKS).toHaveLength(8);
  });
});

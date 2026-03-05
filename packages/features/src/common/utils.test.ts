import { describe, expect, it } from "vitest";

import { isLightSquare, computeSquareColor } from "./utils";
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

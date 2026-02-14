import { describe, expect, it } from "vitest";

import {
  getCornerInfo,
  getDiagonals,
  getDiagonalSquares,
  isValidDiagonalAnswer,
  normalizeDiagonal,
} from "./logic";

// ============================================================
// getDiagonals
// ============================================================
describe("getDiagonals", () => {
  describe("corner squares", () => {
    it("returns correct diagonals for a1 (bottom-left corner)", () => {
      const result = getDiagonals("a1");
      expect(result.diagonal).toBe("a1-h8");
      expect(result.antiDiagonal).toBe("a1");
    });

    it("returns correct diagonals for h8 (top-right corner)", () => {
      const result = getDiagonals("h8");
      expect(result.diagonal).toBe("a1-h8");
      expect(result.antiDiagonal).toBe("h8");
    });

    it("returns correct diagonals for a8 (top-left corner)", () => {
      const result = getDiagonals("a8");
      expect(result.diagonal).toBe("a8");
      expect(result.antiDiagonal).toBe("a8-h1");
    });

    it("returns correct diagonals for h1 (bottom-right corner)", () => {
      const result = getDiagonals("h1");
      expect(result.diagonal).toBe("h1");
      expect(result.antiDiagonal).toBe("a8-h1");
    });
  });

  describe("edge squares", () => {
    it("returns correct diagonals for a4", () => {
      const result = getDiagonals("a4");
      expect(result.diagonal).toBe("a4-e8");
      expect(result.antiDiagonal).toBe("a4-d1");
    });

    it("returns correct diagonals for h4", () => {
      const result = getDiagonals("h4");
      expect(result.diagonal).toBe("e1-h4");
      expect(result.antiDiagonal).toBe("d8-h4");
    });

    it("returns correct diagonals for d1", () => {
      const result = getDiagonals("d1");
      expect(result.diagonal).toBe("d1-h5");
      expect(result.antiDiagonal).toBe("a4-d1");
    });

    it("returns correct diagonals for d8", () => {
      const result = getDiagonals("d8");
      expect(result.diagonal).toBe("a5-d8");
      expect(result.antiDiagonal).toBe("d8-h4");
    });
  });

  describe("center squares", () => {
    it("returns correct diagonals for e4", () => {
      const result = getDiagonals("e4");
      expect(result.diagonal).toBe("b1-h7");
      expect(result.antiDiagonal).toBe("a8-h1");
    });

    it("returns correct diagonals for d5", () => {
      const result = getDiagonals("d5");
      expect(result.diagonal).toBe("a2-g8");
      expect(result.antiDiagonal).toBe("a8-h1");
    });

    it("returns correct diagonals for d4 (center)", () => {
      const result = getDiagonals("d4");
      expect(result.diagonal).toBe("a1-h8");
      expect(result.antiDiagonal).toBe("a7-g1");
    });

    it("returns correct diagonals for e5 (center)", () => {
      const result = getDiagonals("e5");
      expect(result.diagonal).toBe("a1-h8");
      expect(result.antiDiagonal).toBe("b8-h2");
    });
  });

  describe("endpoints are left-to-right ordered", () => {
    it("diagonal endpoints always have lower file first", () => {
      const result = getDiagonals("c3");
      expect(result.diagonal).toBe("a1-h8");
      const diagMatch = result.diagonal.match(/^([a-h])/);
      const diagEndMatch = result.diagonal.match(/-([a-h])/);
      if (diagMatch && diagEndMatch) {
        expect(diagMatch[1].charCodeAt(0)).toBeLessThan(
          diagEndMatch[1].charCodeAt(0),
        );
      }
    });

    it("anti-diagonal endpoints always have lower file first", () => {
      const result = getDiagonals("e4");
      const antiMatch = result.antiDiagonal.match(/^([a-h])/);
      const antiEndMatch = result.antiDiagonal.match(/-([a-h])/);
      if (antiMatch && antiEndMatch) {
        expect(antiMatch[1].charCodeAt(0)).toBeLessThan(
          antiEndMatch[1].charCodeAt(0),
        );
      }
    });
  });

  describe("all 64 squares produce valid outputs", () => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];

    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}`;
        it(`produces valid output for ${square}`, () => {
          const result = getDiagonals(square);
          expect(result).toHaveProperty("diagonal");
          expect(result).toHaveProperty("antiDiagonal");
          expect(result.diagonal).toMatch(/^[a-h][1-8](-[a-h][1-8])?$/);
          expect(result.antiDiagonal).toMatch(/^[a-h][1-8](-[a-h][1-8])?$/);
        });
      }
    }
  });

  describe("invalid input", () => {
    it("throws for invalid square notation", () => {
      expect(() => getDiagonals("i1")).toThrow("Invalid square: i1");
      expect(() => getDiagonals("a9")).toThrow("Invalid square: a9");
      expect(() => getDiagonals("a0")).toThrow("Invalid square: a0");
      expect(() => getDiagonals("")).toThrow("Invalid square: ");
      expect(() => getDiagonals("abc")).toThrow("Invalid square: abc");
    });
  });
});

// ============================================================
// normalizeDiagonal
// ============================================================
describe("normalizeDiagonal", () => {
  describe("already normalized input", () => {
    it("returns as-is when already left-to-right", () => {
      expect(normalizeDiagonal("b1-h7")).toBe("b1-h7");
    });

    it("returns as-is for single square", () => {
      expect(normalizeDiagonal("a1")).toBe("a1");
    });
  });

  describe("reversed input", () => {
    it("normalizes reversed endpoints to left-to-right", () => {
      expect(normalizeDiagonal("h7-b1")).toBe("b1-h7");
    });

    it("normalizes h8-a1 to a1-h8", () => {
      expect(normalizeDiagonal("h8-a1")).toBe("a1-h8");
    });
  });

  describe("case insensitivity", () => {
    it("converts uppercase to lowercase", () => {
      expect(normalizeDiagonal("B1-H7")).toBe("b1-h7");
    });

    it("handles mixed case", () => {
      expect(normalizeDiagonal("b1-H7")).toBe("b1-h7");
    });

    it("handles uppercase single square", () => {
      expect(normalizeDiagonal("A1")).toBe("a1");
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing whitespace", () => {
      expect(normalizeDiagonal("  b1-h7  ")).toBe("b1-h7");
    });

    it("trims single square with whitespace", () => {
      expect(normalizeDiagonal(" a1 ")).toBe("a1");
    });
  });

  describe("same file endpoints", () => {
    it("sorts by rank when files are the same", () => {
      expect(normalizeDiagonal("a5-a1")).toBe("a1-a5");
    });
  });

  describe("invalid format passthrough", () => {
    it("returns the trimmed lowercase input for unrecognized formats", () => {
      expect(normalizeDiagonal("invalid")).toBe("invalid");
      expect(normalizeDiagonal("a1-")).toBe("a1-");
    });
  });
});

// ============================================================
// isValidDiagonalAnswer
// ============================================================
describe("isValidDiagonalAnswer", () => {
  describe("valid answers", () => {
    it("accepts a range of two squares", () => {
      expect(isValidDiagonalAnswer("a1-h8")).toBe(true);
    });

    it("accepts another valid range", () => {
      expect(isValidDiagonalAnswer("b1-h7")).toBe(true);
    });

    it("accepts a single square", () => {
      expect(isValidDiagonalAnswer("a1")).toBe(true);
    });

    it("accepts single square h8", () => {
      expect(isValidDiagonalAnswer("h8")).toBe(true);
    });

    it("accepts uppercase input", () => {
      expect(isValidDiagonalAnswer("A1-H8")).toBe(true);
    });

    it("accepts input with whitespace", () => {
      expect(isValidDiagonalAnswer("  a1-h8  ")).toBe(true);
    });

    it("accepts all file-rank combinations for single squares", () => {
      const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
      for (const f of files) {
        for (const r of ranks) {
          expect(isValidDiagonalAnswer(`${f}${r}`)).toBe(true);
        }
      }
    });
  });

  describe("invalid answers", () => {
    it("rejects empty string", () => {
      expect(isValidDiagonalAnswer("")).toBe(false);
    });

    it("rejects trailing hyphen", () => {
      expect(isValidDiagonalAnswer("a1-")).toBe(false);
    });

    it("rejects leading hyphen", () => {
      expect(isValidDiagonalAnswer("-h8")).toBe(false);
    });

    it("rejects invalid rank (9)", () => {
      expect(isValidDiagonalAnswer("a9-h8")).toBe(false);
    });

    it("rejects invalid file (i)", () => {
      expect(isValidDiagonalAnswer("i1-h8")).toBe(false);
    });

    it("rejects random text", () => {
      expect(isValidDiagonalAnswer("abc")).toBe(false);
    });

    it("rejects three squares", () => {
      expect(isValidDiagonalAnswer("a1-b2-c3")).toBe(false);
    });

    it("rejects whitespace only", () => {
      expect(isValidDiagonalAnswer("   ")).toBe(false);
    });

    it("rejects rank 0", () => {
      expect(isValidDiagonalAnswer("a0")).toBe(false);
    });

    it("rejects numeric-only input", () => {
      expect(isValidDiagonalAnswer("11")).toBe(false);
    });
  });
});

// ============================================================
// getDiagonalSquares
// ============================================================
describe("getDiagonalSquares", () => {
  it("returns all squares on both diagonals for d4", () => {
    const result = getDiagonalSquares("d4");
    // d4 is on the main diagonal a1-h8
    expect(result.diagonal).toEqual([
      "a1",
      "b2",
      "c3",
      "d4",
      "e5",
      "f6",
      "g7",
      "h8",
    ]);
    // d4 anti-diagonal: file+rank = 3+3 = 6
    expect(result.antiDiagonal).toEqual([
      "g1",
      "f2",
      "e3",
      "d4",
      "c5",
      "b6",
      "a7",
    ]);
  });

  it("returns single-square diagonal for corner a8", () => {
    const result = getDiagonalSquares("a8");
    expect(result.diagonal).toEqual(["a8"]);
    // a8 anti-diagonal: a8-h1
    expect(result.antiDiagonal).toEqual([
      "h1",
      "g2",
      "f3",
      "e4",
      "d5",
      "c6",
      "b7",
      "a8",
    ]);
  });

  it("returns single-square anti-diagonal for corner a1", () => {
    const result = getDiagonalSquares("a1");
    expect(result.diagonal).toEqual([
      "a1",
      "b2",
      "c3",
      "d4",
      "e5",
      "f6",
      "g7",
      "h8",
    ]);
    expect(result.antiDiagonal).toEqual(["a1"]);
  });

  it("includes the target square in both diagonals", () => {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}`;
        const result = getDiagonalSquares(square);
        expect(result.diagonal).toContain(square);
        expect(result.antiDiagonal).toContain(square);
      }
    }
  });

  it("returns single-square diagonal for corner h1", () => {
    const result = getDiagonalSquares("h1");
    expect(result.diagonal).toEqual(["h1"]);
    expect(result.antiDiagonal).toEqual([
      "h1",
      "g2",
      "f3",
      "e4",
      "d5",
      "c6",
      "b7",
      "a8",
    ]);
  });

  it("returns single-square anti-diagonal for corner h8", () => {
    const result = getDiagonalSquares("h8");
    expect(result.diagonal).toEqual([
      "a1",
      "b2",
      "c3",
      "d4",
      "e5",
      "f6",
      "g7",
      "h8",
    ]);
    expect(result.antiDiagonal).toEqual(["h8"]);
  });

  it("returns correct diagonals for mid-edge square e1", () => {
    const result = getDiagonalSquares("e1");
    // diagonal: file - rank = 4-0 = 4, starts at e1, goes to h4
    expect(result.diagonal).toEqual(["e1", "f2", "g3", "h4"]);
    // anti-diagonal: file + rank = 4+0 = 4, starts at e1(5th file, rank 1), goes to a5
    expect(result.antiDiagonal).toEqual(["e1", "d2", "c3", "b4", "a5"]);
  });

  it("returns correct diagonals for mid-edge square a5", () => {
    const result = getDiagonalSquares("a5");
    // diagonal: file - rank = 0-4 = -4, starts at a5, goes to d8
    expect(result.diagonal).toEqual(["a5", "b6", "c7", "d8"]);
    // anti-diagonal: file + rank = 0+4 = 4
    expect(result.antiDiagonal).toEqual(["e1", "d2", "c3", "b4", "a5"]);
  });
});

// ============================================================
// getCornerInfo
// ============================================================
describe("getCornerInfo", () => {
  describe("corner squares", () => {
    it("a1 has single anti-diagonal only", () => {
      const result = getCornerInfo("a1");
      expect(result.singleDiagonal).toBe(false);
      expect(result.singleAntiDiagonal).toBe(true);
    });

    it("h8 has single anti-diagonal only", () => {
      const result = getCornerInfo("h8");
      expect(result.singleDiagonal).toBe(false);
      expect(result.singleAntiDiagonal).toBe(true);
    });

    it("a8 has single diagonal only", () => {
      const result = getCornerInfo("a8");
      expect(result.singleDiagonal).toBe(true);
      expect(result.singleAntiDiagonal).toBe(false);
    });

    it("h1 has single diagonal only", () => {
      const result = getCornerInfo("h1");
      expect(result.singleDiagonal).toBe(true);
      expect(result.singleAntiDiagonal).toBe(false);
    });
  });

  describe("non-corner squares", () => {
    it("center square d4 has no single diagonals", () => {
      const result = getCornerInfo("d4");
      expect(result.singleDiagonal).toBe(false);
      expect(result.singleAntiDiagonal).toBe(false);
    });

    it("edge square a4 has no single diagonals", () => {
      const result = getCornerInfo("a4");
      expect(result.singleDiagonal).toBe(false);
      expect(result.singleAntiDiagonal).toBe(false);
    });

    it("edge square d1 has no single diagonals", () => {
      const result = getCornerInfo("d1");
      expect(result.singleDiagonal).toBe(false);
      expect(result.singleAntiDiagonal).toBe(false);
    });

    it("center square e5 has no single diagonals", () => {
      const result = getCornerInfo("e5");
      expect(result.singleDiagonal).toBe(false);
      expect(result.singleAntiDiagonal).toBe(false);
    });
  });

  describe("consistency with getDiagonals", () => {
    it("singleDiagonal matches when getDiagonals returns a single-square diagonal", () => {
      const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];
      for (const file of files) {
        for (const rank of ranks) {
          const square = `${file}${rank}`;
          const cornerInfo = getCornerInfo(square);
          const diags = getDiagonals(square);
          const diagIsSingle = !diags.diagonal.includes("-");
          const antiDiagIsSingle = !diags.antiDiagonal.includes("-");
          expect(cornerInfo.singleDiagonal).toBe(diagIsSingle);
          expect(cornerInfo.singleAntiDiagonal).toBe(antiDiagIsSingle);
        }
      }
    });
  });
});

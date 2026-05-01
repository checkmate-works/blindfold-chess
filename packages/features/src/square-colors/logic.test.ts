import { describe, expect, it } from "vitest";

import { generateRandomSquare, generateSquareSequence } from "../common/utils";

import { getSquareColor, isValidSquare } from "./logic";

// ============================================================
// isValidSquare
// ============================================================
describe("isValidSquare", () => {
  // ----------------------------------------------------------
  // Valid squares
  // ----------------------------------------------------------
  describe("valid squares", () => {
    it("accepts all 64 squares on the board", () => {
      const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];

      for (const file of files) {
        for (const rank of ranks) {
          expect(isValidSquare(`${file}${rank}`)).toBe(true);
        }
      }
    });

    it("accepts corner squares", () => {
      expect(isValidSquare("a1")).toBe(true);
      expect(isValidSquare("a8")).toBe(true);
      expect(isValidSquare("h1")).toBe(true);
      expect(isValidSquare("h8")).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Invalid squares
  // ----------------------------------------------------------
  describe("invalid squares", () => {
    it("rejects files outside a-h", () => {
      expect(isValidSquare("i1")).toBe(false);
      expect(isValidSquare("z4")).toBe(false);
    });

    it("rejects ranks outside 1-8", () => {
      expect(isValidSquare("a0")).toBe(false);
      expect(isValidSquare("a9")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidSquare("")).toBe(false);
    });

    it("rejects strings with wrong length", () => {
      expect(isValidSquare("ab")).toBe(false);
      expect(isValidSquare("abc")).toBe(false);
      expect(isValidSquare("a12")).toBe(false);
    });

    it("rejects reversed format (rank then file)", () => {
      expect(isValidSquare("1a")).toBe(false);
    });

    it("rejects uppercase letters", () => {
      expect(isValidSquare("A1")).toBe(false);
      expect(isValidSquare("H8")).toBe(false);
    });

    it("rejects arbitrary strings", () => {
      expect(isValidSquare("xyz")).toBe(false);
      expect(isValidSquare("hello")).toBe(false);
    });
  });
});

// ============================================================
// getSquareColor
// ============================================================
describe("getSquareColor", () => {
  // ----------------------------------------------------------
  // Corner squares
  // ----------------------------------------------------------
  describe("corner squares", () => {
    it("returns dark for a1", () => {
      expect(getSquareColor("a1")).toBe("dark");
    });

    it("returns light for h1", () => {
      expect(getSquareColor("h1")).toBe("light");
    });

    it("returns light for a8", () => {
      expect(getSquareColor("a8")).toBe("light");
    });

    it("returns dark for h8", () => {
      expect(getSquareColor("h8")).toBe("dark");
    });
  });

  // ----------------------------------------------------------
  // Full board verification
  // ----------------------------------------------------------
  describe("all 64 squares", () => {
    it("correctly identifies the color of every square using (file_index + rank_index) % 2", () => {
      const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];

      for (let fi = 0; fi < files.length; fi++) {
        for (let ri = 0; ri < ranks.length; ri++) {
          const square = `${files[fi]}${ranks[ri]}`;
          const expected = (fi + ri) % 2 === 0 ? "dark" : "light";
          expect(getSquareColor(square)).toBe(expected);
        }
      }
    });
  });

  // ----------------------------------------------------------
  // Specific known squares
  // ----------------------------------------------------------
  describe("representative squares", () => {
    it("returns correct color for a-file squares", () => {
      expect(getSquareColor("a1")).toBe("dark");
      expect(getSquareColor("a2")).toBe("light");
      expect(getSquareColor("a3")).toBe("dark");
      expect(getSquareColor("a4")).toBe("light");
    });

    it("returns correct color for b-file squares", () => {
      expect(getSquareColor("b1")).toBe("light");
      expect(getSquareColor("b2")).toBe("dark");
      expect(getSquareColor("b3")).toBe("light");
      expect(getSquareColor("b4")).toBe("dark");
    });

    it("returns correct color for central squares", () => {
      // d4: file_index=3, rank_index=3, (3+3)%2=0 → dark
      expect(getSquareColor("d4")).toBe("dark");
      // e4: file_index=4, rank_index=3, (4+3)%2=1 → light
      expect(getSquareColor("e4")).toBe("light");
      // d5: file_index=3, rank_index=4, (3+4)%2=1 → light
      expect(getSquareColor("d5")).toBe("light");
      // e5: file_index=4, rank_index=4, (4+4)%2=0 → dark
      expect(getSquareColor("e5")).toBe("dark");
    });
  });

  // ----------------------------------------------------------
  // Invalid squares
  // ----------------------------------------------------------
  describe("invalid squares", () => {
    it("returns null for file outside a-h", () => {
      expect(getSquareColor("i1")).toBeNull();
    });

    it("returns null for rank outside 1-8", () => {
      expect(getSquareColor("a9")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getSquareColor("")).toBeNull();
    });

    it("returns null for arbitrary string", () => {
      expect(getSquareColor("xyz")).toBeNull();
    });
  });
});

// ============================================================
// generateRandomSquare
// ============================================================
describe("generateRandomSquare", () => {
  it("returns a valid square", () => {
    const square = generateRandomSquare();
    expect(isValidSquare(square)).toBe(true);
  });

  it("always returns valid squares across many calls", () => {
    for (let i = 0; i < 100; i++) {
      const square = generateRandomSquare();
      expect(isValidSquare(square)).toBe(true);
    }
  });

  it("exhibits randomness over multiple calls", () => {
    const squares = new Set<string>();

    for (let i = 0; i < 100; i++) {
      squares.add(generateRandomSquare());
    }

    // With 64 possible squares and 100 trials, we expect many distinct values
    expect(squares.size).toBeGreaterThan(1);
  });

  it("returns a string of length 2", () => {
    const square = generateRandomSquare();
    expect(square).toHaveLength(2);
  });

  it("has a valid file (a-h) and rank (1-8)", () => {
    const validFiles = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const validRanks = ["1", "2", "3", "4", "5", "6", "7", "8"];

    for (let i = 0; i < 50; i++) {
      const square = generateRandomSquare();
      expect(validFiles).toContain(square[0]);
      expect(validRanks).toContain(square[1]);
    }
  });
});

// ============================================================
// generateSquareSequence
// ============================================================
describe("generateSquareSequence", () => {
  it("generates the specified number of squares", () => {
    const squares = generateSquareSequence(10);
    expect(squares).toHaveLength(10);
  });

  it("returns an empty array when count is 0", () => {
    const squares = generateSquareSequence(0);
    expect(squares).toHaveLength(0);
  });

  it("generates all valid squares", () => {
    const squares = generateSquareSequence(20);
    for (const square of squares) {
      expect(isValidSquare(square)).toBe(true);
    }
  });

  it("generates 32 unique squares when count is 32", () => {
    const squares = generateSquareSequence(32);
    expect(squares).toHaveLength(32);
    const uniqueSquares = new Set(squares);
    expect(uniqueSquares.size).toBe(32);
  });

  it("can generate 64 squares (reset occurs at 32)", () => {
    const squares = generateSquareSequence(64);
    expect(squares).toHaveLength(64);
    for (const square of squares) {
      expect(isValidSquare(square)).toBe(true);
    }
  });

  it("can generate more than 64 squares", () => {
    const squares = generateSquareSequence(100);
    expect(squares).toHaveLength(100);
    for (const square of squares) {
      expect(isValidSquare(square)).toBe(true);
    }
  });

  it("has no duplicates in the first 32 elements", () => {
    const squares = generateSquareSequence(32);
    const uniqueSquares = new Set(squares);
    expect(uniqueSquares.size).toBe(32);
  });

  it("generates a single square when count is 1", () => {
    const squares = generateSquareSequence(1);
    expect(squares).toHaveLength(1);
    expect(isValidSquare(squares[0])).toBe(true);
  });

  it("returns an array type", () => {
    const squares = generateSquareSequence(5);
    expect(Array.isArray(squares)).toBe(true);
  });
});

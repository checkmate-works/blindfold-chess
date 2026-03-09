import type { Square } from "@blindfold-chess/types";
import { describe, expect, it } from "vitest";

import { FILES, RANKS } from "./constants";
import {
  calculateSymmetricSquare,
  checkSymmetryAnswer,
  generateProblem,
} from "./logic";
import { SYMMETRY_TYPES } from "./types";
import type { BoardSymmetryProblem } from "./types";

// ============================================================
// calculateSymmetricSquare
// ============================================================
describe("calculateSymmetricSquare", () => {
  // ----------------------------------------------------------
  // horizontal (file is mirrored, rank stays)
  // ----------------------------------------------------------
  describe("horizontal", () => {
    it("mirrors file while keeping rank unchanged", () => {
      expect(calculateSymmetricSquare("a1", "horizontal")).toBe("h1");
      expect(calculateSymmetricSquare("e4", "horizontal")).toBe("d4");
      expect(calculateSymmetricSquare("h8", "horizontal")).toBe("a8");
    });

    it("correctly mirrors all 8 files", () => {
      // a<->h, b<->g, c<->f, d<->e
      expect(calculateSymmetricSquare("a3", "horizontal")).toBe("h3");
      expect(calculateSymmetricSquare("h3", "horizontal")).toBe("a3");
      expect(calculateSymmetricSquare("b3", "horizontal")).toBe("g3");
      expect(calculateSymmetricSquare("g3", "horizontal")).toBe("b3");
      expect(calculateSymmetricSquare("c3", "horizontal")).toBe("f3");
      expect(calculateSymmetricSquare("f3", "horizontal")).toBe("c3");
      expect(calculateSymmetricSquare("d3", "horizontal")).toBe("e3");
      expect(calculateSymmetricSquare("e3", "horizontal")).toBe("d3");
    });

    it("is its own inverse (applying twice returns the original)", () => {
      const square = "c5";
      const mirrored = calculateSymmetricSquare(square, "horizontal");
      expect(calculateSymmetricSquare(mirrored, "horizontal")).toBe(square);
    });
  });

  // ----------------------------------------------------------
  // vertical (rank is mirrored, file stays)
  // ----------------------------------------------------------
  describe("vertical", () => {
    it("mirrors rank while keeping file unchanged", () => {
      expect(calculateSymmetricSquare("a1", "vertical")).toBe("a8");
      expect(calculateSymmetricSquare("e4", "vertical")).toBe("e5");
      expect(calculateSymmetricSquare("h8", "vertical")).toBe("h1");
    });

    it("correctly mirrors all 8 ranks", () => {
      // 1<->8, 2<->7, 3<->6, 4<->5
      expect(calculateSymmetricSquare("d1", "vertical")).toBe("d8");
      expect(calculateSymmetricSquare("d8", "vertical")).toBe("d1");
      expect(calculateSymmetricSquare("d2", "vertical")).toBe("d7");
      expect(calculateSymmetricSquare("d7", "vertical")).toBe("d2");
      expect(calculateSymmetricSquare("d3", "vertical")).toBe("d6");
      expect(calculateSymmetricSquare("d6", "vertical")).toBe("d3");
      expect(calculateSymmetricSquare("d4", "vertical")).toBe("d5");
      expect(calculateSymmetricSquare("d5", "vertical")).toBe("d4");
    });

    it("is its own inverse (applying twice returns the original)", () => {
      const square = "f2";
      const mirrored = calculateSymmetricSquare(square, "vertical");
      expect(calculateSymmetricSquare(mirrored, "vertical")).toBe(square);
    });
  });

  // ----------------------------------------------------------
  // point (both file and rank are mirrored)
  // ----------------------------------------------------------
  describe("point", () => {
    it("mirrors both file and rank (180-degree rotation)", () => {
      expect(calculateSymmetricSquare("a1", "point")).toBe("h8");
      expect(calculateSymmetricSquare("e4", "point")).toBe("d5");
      expect(calculateSymmetricSquare("d4", "point")).toBe("e5");
    });

    it("correctly handles all 4 corners", () => {
      expect(calculateSymmetricSquare("a1", "point")).toBe("h8");
      expect(calculateSymmetricSquare("h8", "point")).toBe("a1");
      expect(calculateSymmetricSquare("a8", "point")).toBe("h1");
      expect(calculateSymmetricSquare("h1", "point")).toBe("a8");
    });

    it("correctly handles central squares", () => {
      expect(calculateSymmetricSquare("d4", "point")).toBe("e5");
      expect(calculateSymmetricSquare("e5", "point")).toBe("d4");
      expect(calculateSymmetricSquare("d5", "point")).toBe("e4");
      expect(calculateSymmetricSquare("e4", "point")).toBe("d5");
    });

    it("is its own inverse (applying twice returns the original)", () => {
      const square = "b7";
      const mirrored = calculateSymmetricSquare(square, "point");
      expect(calculateSymmetricSquare(mirrored, "point")).toBe(square);
    });
  });

  // ----------------------------------------------------------
  // Edge cases: all 64 squares produce valid results
  // ----------------------------------------------------------
  describe("edge cases", () => {
    it("returns a valid square for all 64 squares and all symmetry types", () => {
      const validFiles = new Set(FILES);
      const validRanks = new Set(RANKS);

      for (const file of FILES) {
        for (const rank of RANKS) {
          const square = `${file}${rank}` as Square;
          for (const type of SYMMETRY_TYPES) {
            const result = calculateSymmetricSquare(square, type);
            expect(result).toHaveLength(2);
            expect(validFiles.has(result[0] as (typeof FILES)[number])).toBe(
              true,
            );
            expect(validRanks.has(result[1] as (typeof RANKS)[number])).toBe(
              true,
            );
          }
        }
      }
    });

    it("point symmetry equals horizontal + vertical combined", () => {
      for (const file of FILES) {
        for (const rank of RANKS) {
          const square = `${file}${rank}` as Square;
          const pointResult = calculateSymmetricSquare(square, "point");
          const hThenV = calculateSymmetricSquare(
            calculateSymmetricSquare(square, "horizontal"),
            "vertical",
          );
          expect(pointResult).toBe(hThenV);
        }
      }
    });
  });
});

// ============================================================
// generateProblem
// ============================================================
describe("generateProblem", () => {
  it("returns a problem with a valid square (file a-h, rank 1-8)", () => {
    const problem = generateProblem();
    expect(problem.square).toHaveLength(2);
    expect(FILES as readonly string[]).toContain(problem.square[0]);
    expect(RANKS as readonly string[]).toContain(problem.square[1]);
  });

  it("returns a problem with a valid symmetry type", () => {
    const problem = generateProblem();
    expect(SYMMETRY_TYPES).toContain(problem.type);
  });

  it("has the correct shape (square and type properties)", () => {
    const problem = generateProblem();
    expect(problem).toHaveProperty("square");
    expect(problem).toHaveProperty("type");
    expect(typeof problem.square).toBe("string");
    expect(typeof problem.type).toBe("string");
  });

  it("exhibits randomness over multiple calls", () => {
    const squares = new Set<string>();
    const types = new Set<string>();

    // Generate enough problems to expect variation
    for (let i = 0; i < 100; i++) {
      const problem = generateProblem();
      squares.add(problem.square);
      types.add(problem.type);
    }

    // With 64 possible squares and 100 trials, we expect many distinct values
    expect(squares.size).toBeGreaterThan(1);
    // With 3 possible types and 100 trials, all 3 should appear
    expect(types.size).toBe(3);
  });

  it("always produces valid problems across many calls", () => {
    for (let i = 0; i < 50; i++) {
      const problem = generateProblem();
      expect(problem.square).toHaveLength(2);
      expect(FILES as readonly string[]).toContain(problem.square[0]);
      expect(RANKS as readonly string[]).toContain(problem.square[1]);
      expect(SYMMETRY_TYPES).toContain(problem.type);
    }
  });
});

// ============================================================
// checkSymmetryAnswer
// ============================================================
describe("checkSymmetryAnswer", () => {
  // ----------------------------------------------------------
  // Correct answers
  // ----------------------------------------------------------
  describe("correct answers", () => {
    it("returns isCorrect=true for horizontal symmetry", () => {
      const problem: BoardSymmetryProblem = {
        square: "a1",
        type: "horizontal",
      };
      const result = checkSymmetryAnswer("h", "1", problem);
      expect(result.isCorrect).toBe(true);
      expect(result.correctSquare).toBe("h1");
    });

    it("returns isCorrect=true for vertical symmetry", () => {
      const problem: BoardSymmetryProblem = { square: "a1", type: "vertical" };
      const result = checkSymmetryAnswer("a", "8", problem);
      expect(result.isCorrect).toBe(true);
      expect(result.correctSquare).toBe("a8");
    });

    it("returns isCorrect=true for point symmetry", () => {
      const problem: BoardSymmetryProblem = { square: "a1", type: "point" };
      const result = checkSymmetryAnswer("h", "8", problem);
      expect(result.isCorrect).toBe(true);
      expect(result.correctSquare).toBe("h8");
    });
  });

  // ----------------------------------------------------------
  // Incorrect answers
  // ----------------------------------------------------------
  describe("incorrect answers", () => {
    it("returns isCorrect=false with correct square for horizontal", () => {
      const problem: BoardSymmetryProblem = {
        square: "a1",
        type: "horizontal",
      };
      const result = checkSymmetryAnswer("a", "1", problem); // wrong: same square
      expect(result.isCorrect).toBe(false);
      expect(result.correctSquare).toBe("h1");
    });

    it("returns isCorrect=false with correct square for vertical", () => {
      const problem: BoardSymmetryProblem = { square: "e4", type: "vertical" };
      const result = checkSymmetryAnswer("e", "4", problem); // wrong: same square
      expect(result.isCorrect).toBe(false);
      expect(result.correctSquare).toBe("e5");
    });

    it("returns isCorrect=false with correct square for point", () => {
      const problem: BoardSymmetryProblem = { square: "d4", type: "point" };
      const result = checkSymmetryAnswer("d", "4", problem); // wrong: same square
      expect(result.isCorrect).toBe(false);
      expect(result.correctSquare).toBe("e5");
    });
  });

  // ----------------------------------------------------------
  // Always returns correctSquare
  // ----------------------------------------------------------
  describe("correctSquare is always provided", () => {
    it("always includes correctSquare regardless of answer correctness", () => {
      const problem: BoardSymmetryProblem = {
        square: "c6",
        type: "horizontal",
      };
      const correctResult = checkSymmetryAnswer("f", "6", problem);
      expect(correctResult.correctSquare).toBe("f6");

      const wrongResult = checkSymmetryAnswer("a", "1", problem);
      expect(wrongResult.correctSquare).toBe("f6");
    });

    it("works for all symmetry types with various inputs", () => {
      for (const type of SYMMETRY_TYPES) {
        const problem: BoardSymmetryProblem = { square: "e4", type };
        const expected = calculateSymmetricSquare("e4", type);
        const result = checkSymmetryAnswer(expected[0], expected[1], problem);
        expect(result.isCorrect).toBe(true);
        expect(result.correctSquare).toBe(expected);
      }
    });
  });
});

// ============================================================
// Constants and types
// ============================================================
describe("FILES", () => {
  it("contains exactly the 8 chess files in order", () => {
    expect([...FILES]).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });

  it("has length 8", () => {
    expect(FILES).toHaveLength(8);
  });
});

describe("RANKS", () => {
  it("contains exactly the 8 chess ranks in order", () => {
    expect([...RANKS]).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("has length 8", () => {
    expect(RANKS).toHaveLength(8);
  });
});

describe("SYMMETRY_TYPES", () => {
  it("contains exactly the 3 symmetry types", () => {
    expect(SYMMETRY_TYPES).toEqual(["horizontal", "vertical", "point"]);
  });

  it("has length 3", () => {
    expect(SYMMETRY_TYPES).toHaveLength(3);
  });
});

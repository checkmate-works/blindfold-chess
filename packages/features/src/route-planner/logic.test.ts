import { describe, expect, it } from "vitest";

import {
  coordsToSquare,
  findShortestPath,
  generateProblem,
  getPossibleMoves,
  isSameColor,
  isValidRoutePlannerSquare,
  squareToCoords,
  validateUserPath,
} from "./logic";

// ============================================================
// squareToCoords / coordsToSquare
// ============================================================
describe("squareToCoords", () => {
  it("converts a1 to [0, 0]", () => {
    expect(squareToCoords("a1")).toEqual([0, 0]);
  });

  it("converts h8 to [7, 7]", () => {
    expect(squareToCoords("h8")).toEqual([7, 7]);
  });

  it("converts e4 to [4, 3]", () => {
    expect(squareToCoords("e4")).toEqual([4, 3]);
  });

  it("converts a8 to [0, 7]", () => {
    expect(squareToCoords("a8")).toEqual([0, 7]);
  });

  it("converts h1 to [7, 0]", () => {
    expect(squareToCoords("h1")).toEqual([7, 0]);
  });
});

describe("coordsToSquare", () => {
  it("converts [0, 0] to a1", () => {
    expect(coordsToSquare(0, 0)).toBe("a1");
  });

  it("converts [7, 7] to h8", () => {
    expect(coordsToSquare(7, 7)).toBe("h8");
  });

  it("converts [4, 3] to e4", () => {
    expect(coordsToSquare(4, 3)).toBe("e4");
  });

  it("returns empty string for out-of-bound coords", () => {
    expect(coordsToSquare(-1, 0)).toBe("");
    expect(coordsToSquare(0, -1)).toBe("");
    expect(coordsToSquare(8, 0)).toBe("");
    expect(coordsToSquare(0, 8)).toBe("");
  });
});

// ============================================================
// isValidRoutePlannerSquare
// ============================================================
describe("isValidRoutePlannerSquare", () => {
  it("returns true for valid squares", () => {
    expect(isValidRoutePlannerSquare("a1")).toBe(true);
    expect(isValidRoutePlannerSquare("h8")).toBe(true);
    expect(isValidRoutePlannerSquare("e4")).toBe(true);
  });

  it("returns false for invalid squares", () => {
    expect(isValidRoutePlannerSquare("")).toBe(false);
    expect(isValidRoutePlannerSquare("i1")).toBe(false);
    expect(isValidRoutePlannerSquare("a9")).toBe(false);
    expect(isValidRoutePlannerSquare("a0")).toBe(false);
    expect(isValidRoutePlannerSquare("abc")).toBe(false);
    expect(isValidRoutePlannerSquare("1a")).toBe(false);
  });
});

// ============================================================
// isSameColor
// ============================================================
describe("isSameColor", () => {
  it("returns true for two light squares", () => {
    // a2 is light (0+1=1 odd), c4 is light (2+3=5 odd)
    expect(isSameColor("a2", "c4")).toBe(true);
  });

  it("returns true for two dark squares", () => {
    // a1 is dark (0+0=0 even), c3 is dark (2+2=4 even)
    expect(isSameColor("a1", "c3")).toBe(true);
  });

  it("returns false for squares of different colors", () => {
    // a1 is dark, a2 is light
    expect(isSameColor("a1", "a2")).toBe(false);
  });

  it("returns true for a square compared to itself", () => {
    expect(isSameColor("e4", "e4")).toBe(true);
  });

  it("all corner squares: a1, a8, h1, h8 color checks", () => {
    // a1 (0+0=0, dark), h8 (7+7=14, dark) -> same
    expect(isSameColor("a1", "h8")).toBe(true);
    // a1 (dark), a8 (0+7=7, light) -> different
    expect(isSameColor("a1", "a8")).toBe(false);
    // a1 (dark), h1 (7+0=7, light) -> different
    expect(isSameColor("a1", "h1")).toBe(false);
    // a8 (light), h1 (light) -> same
    expect(isSameColor("a8", "h1")).toBe(true);
  });
});

// ============================================================
// getPossibleMoves
// ============================================================
describe("getPossibleMoves", () => {
  describe("Knight", () => {
    it("returns 8 moves from center square d4", () => {
      const moves = getPossibleMoves("n", "d4");
      expect(moves).toHaveLength(8);
      expect(moves).toContain("e6");
      expect(moves).toContain("e2");
      expect(moves).toContain("c6");
      expect(moves).toContain("c2");
      expect(moves).toContain("f5");
      expect(moves).toContain("f3");
      expect(moves).toContain("b5");
      expect(moves).toContain("b3");
    });

    it("returns 2 moves from corner a1", () => {
      const moves = getPossibleMoves("n", "a1");
      expect(moves).toHaveLength(2);
      expect(moves).toContain("b3");
      expect(moves).toContain("c2");
    });

    it("returns 2 moves from corner h8", () => {
      const moves = getPossibleMoves("n", "h8");
      expect(moves).toHaveLength(2);
      expect(moves).toContain("g6");
      expect(moves).toContain("f7");
    });

    it("returns 4 moves from edge square a4", () => {
      const moves = getPossibleMoves("n", "a4");
      expect(moves).toHaveLength(4);
      expect(moves).toContain("b6");
      expect(moves).toContain("b2");
      expect(moves).toContain("c5");
      expect(moves).toContain("c3");
    });
  });

  describe("Bishop", () => {
    it("returns 13 moves from center d4", () => {
      const moves = getPossibleMoves("b", "d4");
      expect(moves).toHaveLength(13);
      // main diagonal: e5, f6, g7, h8, c3, b2, a1
      expect(moves).toContain("a1");
      expect(moves).toContain("h8");
      // anti-diagonal: e3, f2, g1, c5, b6, a7
      expect(moves).toContain("g1");
      expect(moves).toContain("a7");
    });

    it("returns 7 moves from corner a1", () => {
      const moves = getPossibleMoves("b", "a1");
      expect(moves).toHaveLength(7);
      expect(moves).toContain("b2");
      expect(moves).toContain("h8");
    });

    it("only returns diagonal squares, not rank/file squares", () => {
      const moves = getPossibleMoves("b", "d4");
      // d5 is on the same file, not reachable by bishop
      expect(moves).not.toContain("d5");
      // e4 is on the same rank, not reachable by bishop
      expect(moves).not.toContain("e4");
    });
  });

  describe("Rook", () => {
    it("returns 14 moves from any square", () => {
      const moves = getPossibleMoves("r", "d4");
      expect(moves).toHaveLength(14);
    });

    it("includes all file and rank squares", () => {
      const moves = getPossibleMoves("r", "a1");
      expect(moves).toHaveLength(14);
      // along file a
      expect(moves).toContain("a2");
      expect(moves).toContain("a8");
      // along rank 1
      expect(moves).toContain("b1");
      expect(moves).toContain("h1");
    });

    it("does not include diagonal squares", () => {
      const moves = getPossibleMoves("r", "a1");
      expect(moves).not.toContain("b2");
      expect(moves).not.toContain("c3");
    });
  });

  describe("Queen", () => {
    it("returns 27 moves from center d4", () => {
      const moves = getPossibleMoves("q", "d4");
      // 7 along file + 7 along rank + 13 diagonal = 27
      expect(moves).toHaveLength(27);
    });

    it("returns 21 moves from corner a1", () => {
      const moves = getPossibleMoves("q", "a1");
      // 7 along file + 7 along rank + 7 diagonal = 21
      expect(moves).toHaveLength(21);
    });

    it("includes both diagonal and straight moves", () => {
      const moves = getPossibleMoves("q", "d4");
      // straight
      expect(moves).toContain("d8");
      expect(moves).toContain("a4");
      // diagonal
      expect(moves).toContain("a1");
      expect(moves).toContain("h8");
    });
  });
});

// ============================================================
// findShortestPath
// ============================================================
describe("findShortestPath", () => {
  it("returns [start] when start === end", () => {
    expect(findShortestPath("n", "e4", "e4")).toEqual(["e4"]);
  });

  describe("Rook paths", () => {
    it("finds 1-move path on the same rank", () => {
      const path = findShortestPath("r", "a1", "h1");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(2);
      expect(path![0]).toBe("a1");
      expect(path![1]).toBe("h1");
    });

    it("finds 1-move path on the same file", () => {
      const path = findShortestPath("r", "a1", "a8");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(2);
    });

    it("finds 2-move path from a1 to h8 (corner to corner)", () => {
      const path = findShortestPath("r", "a1", "h8");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(3);
    });
  });

  describe("Bishop paths", () => {
    it("finds 1-move path for adjacent diagonal", () => {
      const path = findShortestPath("b", "a1", "b2");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(2);
    });

    it("finds path between same-color squares", () => {
      const path = findShortestPath("b", "a1", "h8");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(2); // a1 and h8 are on the same diagonal
    });

    it("returns null for different-color squares", () => {
      // a1 (dark) and a2 (light) - bishop cannot reach
      const path = findShortestPath("b", "a1", "a2");
      expect(path).toBeNull();
    });

    it("finds 2-move path for same-color squares not on same diagonal", () => {
      // a1 is dark, a3 is dark but not on the same diagonal
      const path = findShortestPath("b", "a1", "a3");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(3); // 2 moves
    });
  });

  describe("Knight paths", () => {
    it("finds 1-move path for direct knight jump", () => {
      const path = findShortestPath("n", "a1", "b3");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(2);
    });

    it("finds path from corner to corner a1->h8", () => {
      const path = findShortestPath("n", "a1", "h8");
      expect(path).not.toBeNull();
      // Knight from a1 to h8 takes 6 moves
      expect(path!.length).toBeGreaterThanOrEqual(2);
      expect(path![0]).toBe("a1");
      expect(path![path!.length - 1]).toBe("h8");
    });

    it("can reach any square from any other square", () => {
      // Knight can reach any square on the board
      const path = findShortestPath("n", "a1", "b1");
      expect(path).not.toBeNull();
    });
  });

  describe("Queen paths", () => {
    it("finds 1-move path for any reachable square", () => {
      // Queen can reach h8 from a1 in 1 move (diagonal)
      const path = findShortestPath("q", "a1", "h8");
      expect(path).not.toBeNull();
      expect(path!).toHaveLength(2);
    });

    it("finds path between any two distinct squares in at most 2 moves", () => {
      // Queen can always reach any square in at most 2 moves
      const path = findShortestPath("q", "a1", "b3");
      expect(path).not.toBeNull();
      expect(path!.length).toBeLessThanOrEqual(3);
    });
  });

  describe("path validity", () => {
    it("every step in the path is a valid move", () => {
      const testCases = [
        { piece: "n", start: "a1", end: "h8" } as const,
        { piece: "b", start: "a1", end: "h8" } as const,
        { piece: "r", start: "a1", end: "h8" } as const,
        { piece: "q", start: "a1", end: "h8" } as const,
      ];
      for (const { piece, start, end } of testCases) {
        const path = findShortestPath(piece, start, end);
        if (path) {
          for (let i = 0; i < path.length - 1; i++) {
            const moves = getPossibleMoves(piece, path[i]);
            expect(moves).toContain(path[i + 1]);
          }
        }
      }
    });
  });
});

// ============================================================
// validateUserPath
// ============================================================
describe("validateUserPath", () => {
  it("returns invalid for empty path", () => {
    const result = validateUserPath("n", "a1", [], "b3");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.error).toBe("Empty path");
  });

  it("returns invalid when path does not end at goal", () => {
    const result = validateUserPath("n", "a1", ["c2"], "b3");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.error).toBe("Path does not end at goal");
  });

  it("returns invalid for an invalid square in the path", () => {
    // "z9" is not a legal square; it can only appear via the raw-string
    // userPath (the goal parameter is typed Square).
    const result = validateUserPath("n", "a1", ["z9", "b3"], "b3");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.error).toBe("Invalid square: z9");
  });

  it("returns invalid for an illegal move", () => {
    // Knight from a1 cannot go to a2
    const result = validateUserPath("n", "a1", ["a2", "b3"], "b3");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.error).toBe("Invalid move");
  });

  it("validates a correct knight path", () => {
    const result = validateUserPath("n", "a1", ["b3"], "b3");
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid result");
    expect(result.fullPath).toEqual(["a1", "b3"]);
  });

  it("validates a correct multi-step knight path", () => {
    const result = validateUserPath("n", "a1", ["c2", "e3"], "e3");
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid result");
    expect(result.fullPath).toEqual(["a1", "c2", "e3"]);
  });

  it("validates a correct rook path", () => {
    const result = validateUserPath("r", "a1", ["a8"], "a8");
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid result");
    expect(result.fullPath).toEqual(["a1", "a8"]);
  });

  it("validates a correct bishop path", () => {
    const result = validateUserPath("b", "a1", ["d4", "g7"], "g7");
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid result");
    expect(result.fullPath).toEqual(["a1", "d4", "g7"]);
  });

  it("validates a correct queen path", () => {
    const result = validateUserPath("q", "a1", ["h8"], "h8");
    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid result");
    expect(result.fullPath).toEqual(["a1", "h8"]);
  });

  it("rejects a rook moving diagonally", () => {
    const result = validateUserPath("r", "a1", ["b2"], "b2");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.error).toBe("Invalid move");
  });

  it("rejects a bishop moving along a rank", () => {
    const result = validateUserPath("b", "a1", ["b1"], "b1");
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("expected invalid result");
    expect(result.error).toBe("Invalid move");
  });
});

// ============================================================
// generateProblem - difficulty constraints
// ============================================================
describe("generateProblem", () => {
  const ITERATIONS = 50;

  describe("Rook constraints", () => {
    it("always generates problems where path.length >= 3 (min 2 moves, at least one intermediate square)", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem(["r"]);
        expect(problem.piece).toBe("r");
        expect(problem.start).not.toBe(problem.end);

        const path = findShortestPath("r", problem.start, problem.end);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("Queen constraints", () => {
    it("always generates problems where path.length >= 3 (min 2 moves, at least one intermediate square)", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem(["q"]);
        expect(problem.piece).toBe("q");
        expect(problem.start).not.toBe(problem.end);

        const path = findShortestPath("q", problem.start, problem.end);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("Bishop constraints", () => {
    it("always generates problems where path.length === 3 (exactly 2 moves)", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem(["b"]);
        expect(problem.piece).toBe("b");
        expect(problem.start).not.toBe(problem.end);

        const path = findShortestPath("b", problem.start, problem.end);
        expect(path).not.toBeNull();
        expect(path!).toHaveLength(3);
      }
    });

    it("always generates start and end on the same color", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem(["b"]);
        expect(isSameColor(problem.start, problem.end)).toBe(true);
      }
    });
  });

  describe("Knight constraints", () => {
    it("always generates problems where 3 <= path.length <= 4 (2-3 moves)", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem(["n"]);
        expect(problem.piece).toBe("n");
        expect(problem.start).not.toBe(problem.end);

        const path = findShortestPath("n", problem.start, problem.end);
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(3);
        expect(path!.length).toBeLessThanOrEqual(4);
      }
    });
  });

  // ============================================================
  // Trivial problem exclusion
  // These tests verify the business rule: "1-move problems must never
  // be generated." Each piece type has constraints that reject trivially
  // simple routes where the target is directly reachable in a single move.
  // ============================================================
  describe("trivial problem exclusion", () => {
    it("Bishop: never generates problems where start and end share a diagonal (1-move route)", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem(["b"]);
        const path = findShortestPath("b", problem.start, problem.end);
        expect(path).not.toBeNull();
        // pathLength === 2 would mean start and end are on the same diagonal (1 move)
        expect(path!.length).not.toBe(2);
        // Must be exactly 3 (2 moves)
        expect(path!).toHaveLength(3);
      }
    });

    it("Knight: never generates problems where start and end are 1 knight-move apart", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem(["n"]);
        const path = findShortestPath("n", problem.start, problem.end);
        expect(path).not.toBeNull();
        // pathLength === 2 would mean a direct 1-move knight jump
        expect(path!.length).not.toBe(2);
        expect(path!.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("all generated problems require at least 2 moves (pathLength >= 3)", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem();
        const path = findShortestPath(
          problem.piece,
          problem.start,
          problem.end,
        );
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("general", () => {
    it("returns a valid problem structure", () => {
      const problem = generateProblem();
      expect(problem).toHaveProperty("piece");
      expect(problem).toHaveProperty("start");
      expect(problem).toHaveProperty("end");
      expect(["n", "b", "r", "q"]).toContain(problem.piece);
      expect(isValidRoutePlannerSquare(problem.start)).toBe(true);
      expect(isValidRoutePlannerSquare(problem.end)).toBe(true);
      expect(problem.start).not.toBe(problem.end);
    });

    it("respects allowedPieces parameter", () => {
      for (let i = 0; i < 20; i++) {
        const problem = generateProblem(["n", "r"]);
        expect(["n", "r"]).toContain(problem.piece);
      }
    });

    it("uses default pieces when given empty array", () => {
      const problem = generateProblem([]);
      expect(["n", "b", "r", "q"]).toContain(problem.piece);
    });

    it("generated problems always have a valid shortest path", () => {
      for (let i = 0; i < ITERATIONS; i++) {
        const problem = generateProblem();
        const path = findShortestPath(
          problem.piece,
          problem.start,
          problem.end,
        );
        expect(path).not.toBeNull();
        expect(path!.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});

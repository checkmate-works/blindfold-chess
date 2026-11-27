import { describe, expect, it } from "vitest";

import { executeMove, isCheckmateFen } from "../chess-core/moves";
import { calculateAccuracy } from "../common/accuracy";
import {
  DOJO_EXAMS,
  type MemoryExamProblem,
  type PuzzleExamProblem,
  examProblemFor,
  gradeExamProblem,
  isExamEligible,
} from "./exams";

const memory = DOJO_EXAMS["2kyu"]!.position_memory as MemoryExamProblem;
const puzzle = DOJO_EXAMS["2kyu"]!.puzzle as PuzzleExamProblem;

// The exam's position without the knight, the bishop and black's h-pawn.
const MISSING_THREE = "5rk1/5pp1/8/8/8/6P1/5P1P/5RK1 w - - 0 1";
// Only the kings, in place.
const KINGS_ONLY = "6k1/8/8/8/8/8/8/6K1 w - - 0 1";

describe("DOJO_EXAMS", () => {
  it("sets 2kyu two castled kings of twelve pieces to memorise for 30 seconds at 100%", () => {
    expect(memory).toEqual({
      kind: "position_memory",
      fen: "5rk1/5ppp/5n2/8/8/6P1/5PBP/5RK1 w - - 0 1",
      memorizeSeconds: 30,
      minAccuracy: 100,
    });
  });

  it("ends in checkmate when the 2kyu puzzle's solution is replayed", () => {
    for (const line of puzzle.solutions) {
      let fen = puzzle.fen;
      for (const { san } of line) {
        const next = executeMove(fen, san);
        expect(next, `${san} is legal in ${fen}`).not.toBeNull();
        fen = next!.fen;
      }
      expect(isCheckmateFen(fen)).toBe(true);
    }
  });

  it("makes the 2kyu puzzle a mate in two for white", () => {
    expect(puzzle.fen.split(" ")[1]).toBe("w");
    expect(puzzle.solutions).toHaveLength(1);
    expect(puzzle.solutions[0]!.map((m) => m.san)).toEqual([
      "Qg8+",
      "Rxg8",
      "Nf7#",
    ]);
  });
});

describe("examProblemFor", () => {
  it("finds a known rank's problem by kind", () => {
    expect(examProblemFor("2kyu", "puzzle")).toBe(puzzle);
    expect(examProblemFor("2kyu", "position_memory")).toBe(memory);
  });

  it("is undefined for ranks without an exam, unknown kinds and prototype keys", () => {
    expect(examProblemFor("5kyu", "puzzle")).toBeUndefined();
    expect(examProblemFor("mukyu", "puzzle")).toBeUndefined();
    expect(examProblemFor("2dan", "puzzle")).toBeUndefined();
    expect(examProblemFor("2kyu", "memory")).toBeUndefined();
    expect(examProblemFor("__proto__", "puzzle")).toBeUndefined();
    expect(examProblemFor("2kyu", "constructor")).toBeUndefined();
  });
});

describe("gradeExamProblem: position memory", () => {
  it("passes an exact recreation at 100%", () => {
    expect(gradeExamProblem(memory, { fen: memory.fen })).toEqual({
      passed: true,
      accuracy: 100,
    });
  });

  it("gives the same accuracy the position-memory session shows for the same recreation", () => {
    const session = calculateAccuracy(
      memory.fen,
      MISSING_THREE,
      { p: "pawn", n: "knight", b: "bishop" },
      {
        correct: (piece, square) => `${piece} on ${square}`,
        wrongPiece: (square) => `wrong on ${square}`,
        missing: (piece, square) => `${piece} missing from ${square}`,
        extra: (piece, square) => `extra ${piece} on ${square}`,
      },
    );
    const grade = gradeExamProblem(memory, { fen: MISSING_THREE });
    expect(grade.accuracy).toBe(session.accuracy);
    expect(grade).toEqual({ passed: false, accuracy: 75 });
  });

  it("fails a recreation below the required accuracy", () => {
    const grade = gradeExamProblem(memory, { fen: KINGS_ONLY });
    expect(grade.passed).toBe(false);
    expect(grade.accuracy).toBeLessThan(memory.minAccuracy);
  });

  it("passes at exactly the required accuracy and fails just under it", () => {
    const answer = { fen: MISSING_THREE };
    expect(
      gradeExamProblem({ ...memory, minAccuracy: 75 }, answer).passed,
    ).toBe(true);
    expect(
      gradeExamProblem({ ...memory, minAccuracy: 75.01 }, answer).passed,
    ).toBe(false);
  });

  it("fails answers of the wrong shape or with an unreadable FEN without throwing", () => {
    for (const answer of [
      null,
      undefined,
      "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1",
      {},
      { fen: 42 },
      { moves: ["Qg8+"] },
      { fen: "not a fen" },
      { fen: "8/8/8/8/8/8/8 w - - 0 1" },
      { fen: `${memory.fen}${" ".repeat(200)}` },
    ]) {
      expect(gradeExamProblem(memory, answer)).toEqual({
        passed: false,
        accuracy: null,
      });
    }
  });
});

describe("gradeExamProblem: puzzle", () => {
  it("passes the player's moves of the solution, with no accuracy", () => {
    expect(gradeExamProblem(puzzle, { moves: ["Qg8+", "Nf7#"] })).toEqual({
      passed: true,
      accuracy: null,
    });
  });

  it("accepts the player's moves without check marks, as the puzzle session does", () => {
    expect(gradeExamProblem(puzzle, { moves: ["Qg8", "Nf7"] }).passed).toBe(
      true,
    );
  });

  it("fails a wrong move anywhere in the line", () => {
    expect(gradeExamProblem(puzzle, { moves: ["Nf7+", "Qg8"] }).passed).toBe(
      false,
    );
    expect(gradeExamProblem(puzzle, { moves: ["Qg8+", "Qxg8"] }).passed).toBe(
      false,
    );
  });

  it("fails too few moves and moves past the end of the line", () => {
    expect(gradeExamProblem(puzzle, { moves: ["Qg8+"] }).passed).toBe(false);
    expect(
      gradeExamProblem(puzzle, { moves: ["Qg8+", "Nf7#", "Kh2"] }).passed,
    ).toBe(false);
  });

  it("fails answers of the wrong shape or with illegal moves without throwing", () => {
    for (const answer of [
      null,
      "Qg8+ Nf7#",
      {},
      { moves: [] },
      { moves: "Qg8+" },
      { moves: ["Qg8+", 7] },
      { fen: puzzle.fen },
      { moves: ["Zz9", "Nf7#"] },
      { moves: Array.from({ length: 1000 }, () => "Qg8+") },
    ]) {
      expect(gradeExamProblem(puzzle, answer)).toEqual({
        passed: false,
        accuracy: null,
      });
    }
  });
});

describe("isExamEligible", () => {
  it("records a pass when the exam's rank is the next one to earn", () => {
    expect(isExamEligible("2kyu", "3kyu")).toBe(true);
    expect(isExamEligible("5kyu", undefined)).toBe(true);
  });

  it("records a pass when the exam's rank is already held", () => {
    expect(isExamEligible("2kyu", "2kyu")).toBe(true);
    expect(isExamEligible("2kyu", "1dan")).toBe(true);
  });

  it("only grades as practice when a rank would be skipped, so the highest rank still covers every rank below", () => {
    expect(isExamEligible("2kyu", "4kyu")).toBe(false);
    expect(isExamEligible("2kyu", "5kyu")).toBe(false);
    expect(isExamEligible("2kyu", undefined)).toBe(false);
  });
});

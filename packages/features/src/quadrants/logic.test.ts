import { describe, expect, it } from "vitest";

import {
  checkQuadrantAnswer,
  generateQuadrantQuestion,
  generateQuadrantQuestionBatch,
  getCorrectQuadrant,
} from "./logic";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

describe("getCorrectQuadrant", () => {
  it("identifies q1 (king side upper): e-h files, ranks 5-8", () => {
    const q1Squares = ["e5", "f6", "g7", "h8", "e8", "h5"];
    for (const square of q1Squares) {
      expect(getCorrectQuadrant(square)).toBe("q1");
    }
  });

  it("identifies q2 (queen side upper): a-d files, ranks 5-8", () => {
    const q2Squares = ["a5", "b6", "c7", "d8", "a8", "d5"];
    for (const square of q2Squares) {
      expect(getCorrectQuadrant(square)).toBe("q2");
    }
  });

  it("identifies q3 (queen side lower): a-d files, ranks 1-4", () => {
    const q3Squares = ["a1", "b2", "c3", "d4", "a4", "d1"];
    for (const square of q3Squares) {
      expect(getCorrectQuadrant(square)).toBe("q3");
    }
  });

  it("identifies q4 (king side lower): e-h files, ranks 1-4", () => {
    const q4Squares = ["e1", "f2", "g3", "h4", "e4", "h1"];
    for (const square of q4Squares) {
      expect(getCorrectQuadrant(square)).toBe("q4");
    }
  });

  it("correctly classifies all 64 squares", () => {
    for (const file of FILES) {
      for (const rank of RANKS) {
        const square = `${file}${rank}`;
        const quadrant = getCorrectQuadrant(square);
        const rankNum = parseInt(rank);
        const isKingSide = ["e", "f", "g", "h"].includes(file);
        const isUpper = rankNum >= 5;

        if (isKingSide && isUpper) expect(quadrant).toBe("q1");
        else if (!isKingSide && isUpper) expect(quadrant).toBe("q2");
        else if (!isKingSide && !isUpper) expect(quadrant).toBe("q3");
        else expect(quadrant).toBe("q4");
      }
    }
  });

  it("boundary: rank 4 is lower, rank 5 is upper", () => {
    expect(getCorrectQuadrant("e4")).toBe("q4");
    expect(getCorrectQuadrant("e5")).toBe("q1");
    expect(getCorrectQuadrant("d4")).toBe("q3");
    expect(getCorrectQuadrant("d5")).toBe("q2");
  });

  it("boundary: file d is queen side, file e is king side", () => {
    expect(getCorrectQuadrant("d1")).toBe("q3");
    expect(getCorrectQuadrant("e1")).toBe("q4");
    expect(getCorrectQuadrant("d8")).toBe("q2");
    expect(getCorrectQuadrant("e8")).toBe("q1");
  });
});

describe("checkQuadrantAnswer", () => {
  it("returns true for correct answer", () => {
    expect(checkQuadrantAnswer("e5", "q1")).toBe(true);
    expect(checkQuadrantAnswer("a1", "q3")).toBe(true);
  });

  it("returns false for incorrect answer", () => {
    expect(checkQuadrantAnswer("e5", "q2")).toBe(false);
    expect(checkQuadrantAnswer("a1", "q1")).toBe(false);
  });

  it("returns true for correct answer in each quadrant", () => {
    expect(checkQuadrantAnswer("h8", "q1")).toBe(true);
    expect(checkQuadrantAnswer("a8", "q2")).toBe(true);
    expect(checkQuadrantAnswer("a1", "q3")).toBe(true);
    expect(checkQuadrantAnswer("h1", "q4")).toBe(true);
  });

  it("returns false for each wrong quadrant per square", () => {
    // h8 is q1 — wrong answers are q2, q3, q4
    expect(checkQuadrantAnswer("h8", "q2")).toBe(false);
    expect(checkQuadrantAnswer("h8", "q3")).toBe(false);
    expect(checkQuadrantAnswer("h8", "q4")).toBe(false);
  });

  it("handles boundary squares between quadrants correctly", () => {
    // d4 is q3, e4 is q4 — adjacent files, same rank
    expect(checkQuadrantAnswer("d4", "q3")).toBe(true);
    expect(checkQuadrantAnswer("d4", "q4")).toBe(false);
    expect(checkQuadrantAnswer("e4", "q4")).toBe(true);
    expect(checkQuadrantAnswer("e4", "q3")).toBe(false);

    // d5 is q2, e5 is q1 — adjacent files, same rank
    expect(checkQuadrantAnswer("d5", "q2")).toBe(true);
    expect(checkQuadrantAnswer("d5", "q1")).toBe(false);
    expect(checkQuadrantAnswer("e5", "q1")).toBe(true);
    expect(checkQuadrantAnswer("e5", "q2")).toBe(false);

    // d4 is q3, d5 is q2 — same file, adjacent ranks
    expect(checkQuadrantAnswer("d4", "q3")).toBe(true);
    expect(checkQuadrantAnswer("d4", "q2")).toBe(false);
    expect(checkQuadrantAnswer("d5", "q2")).toBe(true);
    expect(checkQuadrantAnswer("d5", "q3")).toBe(false);

    // e4 is q4, e5 is q1 — same file, adjacent ranks
    expect(checkQuadrantAnswer("e4", "q4")).toBe(true);
    expect(checkQuadrantAnswer("e4", "q1")).toBe(false);
    expect(checkQuadrantAnswer("e5", "q1")).toBe(true);
    expect(checkQuadrantAnswer("e5", "q4")).toBe(false);
  });
});

describe("generateQuadrantQuestion", () => {
  it("generates a valid square", () => {
    const q = generateQuadrantQuestion("white");
    expect(q.square).toHaveLength(2);
    expect(FILES).toContain(q.square[0]);
    expect(RANKS).toContain(q.square[1]);
  });

  it("uses the specified orientation when not random", () => {
    const qw = generateQuadrantQuestion("white");
    expect(qw.orientation).toBe("white");

    const qb = generateQuadrantQuestion("black");
    expect(qb.orientation).toBe("black");
  });

  it("resolves random orientation to white or black", () => {
    const orientations = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const q = generateQuadrantQuestion("random");
      orientations.add(q.orientation);
    }
    expect(orientations.has("white")).toBe(true);
    expect(orientations.has("black")).toBe(true);
  });

  it("never resolves to 'random' as an orientation value", () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuadrantQuestion("random");
      expect(q.orientation).not.toBe("random");
      expect(["white", "black"]).toContain(q.orientation);
    }
  });

  it("generated square belongs to a valid quadrant", () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuadrantQuestion("white");
      const quadrant = getCorrectQuadrant(q.square);
      expect(["q1", "q2", "q3", "q4"]).toContain(quadrant);
    }
  });
});

describe("generateQuadrantQuestionBatch", () => {
  it("generates the requested number of questions", () => {
    const batch = generateQuadrantQuestionBatch(50, "white");
    expect(batch).toHaveLength(50);
  });

  it("all questions have valid squares", () => {
    const batch = generateQuadrantQuestionBatch(100, "white");
    for (const q of batch) {
      expect(q.square).toHaveLength(2);
      expect(FILES).toContain(q.square[0]);
      expect(RANKS).toContain(q.square[1]);
    }
  });

  it("returns empty array for size 0", () => {
    const batch = generateQuadrantQuestionBatch(0, "white");
    expect(batch).toHaveLength(0);
    expect(batch).toEqual([]);
  });

  it("returns exactly 1 question for size 1", () => {
    const batch = generateQuadrantQuestionBatch(1, "white");
    expect(batch).toHaveLength(1);
    expect(batch[0].square).toHaveLength(2);
  });

  it("respects black orientation for all questions", () => {
    const batch = generateQuadrantQuestionBatch(20, "black");
    for (const q of batch) {
      expect(q.orientation).toBe("black");
    }
  });

  it("respects white orientation for all questions", () => {
    const batch = generateQuadrantQuestionBatch(20, "white");
    for (const q of batch) {
      expect(q.orientation).toBe("white");
    }
  });

  it("random orientation resolves to white or black for each question", () => {
    const batch = generateQuadrantQuestionBatch(100, "random");
    const orientations = new Set(batch.map((q) => q.orientation));
    // Each question should have resolved orientation
    for (const q of batch) {
      expect(["white", "black"]).toContain(q.orientation);
    }
    // With 100 questions, both orientations should appear
    expect(orientations.has("white")).toBe(true);
    expect(orientations.has("black")).toBe(true);
  });
});

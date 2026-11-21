import { describe, expect, it } from "vitest";

import type { RandomSource } from "../common/utils";
import {
  LEGAL_MOVES_PIECE_SELECTIONS,
  legalMovesChallengeDefinition as definition,
  legalMovesPiecesForSelection,
} from "./challenge";
import { generateBalancedMoveQuestions } from "./logic";

/** Deterministic rng (mulberry32) so two runs draw the same sequence. */
function seededRng(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("legalMovesPiecesForSelection", () => {
  it("drills only the named piece", () => {
    expect(legalMovesPiecesForSelection("king")).toEqual(["k"]);
    expect(legalMovesPiecesForSelection("queen")).toEqual(["q"]);
    expect(legalMovesPiecesForSelection("rook")).toEqual(["r"]);
    expect(legalMovesPiecesForSelection("bishop")).toEqual(["b"]);
    expect(legalMovesPiecesForSelection("knight")).toEqual(["n"]);
  });

  it("drills all five pieces for random", () => {
    expect(legalMovesPiecesForSelection("random")).toEqual([
      "k",
      "q",
      "r",
      "b",
      "n",
    ]);
  });

  it("returns a fresh array each call", () => {
    const pieces = legalMovesPiecesForSelection("random");
    pieces.pop();
    expect(legalMovesPiecesForSelection("random")).toHaveLength(5);
  });
});

describe("legalMovesChallengeDefinition", () => {
  describe("parseSettings", () => {
    it("offers the five pieces and random, which are the leaderboard keys", () => {
      expect(LEGAL_MOVES_PIECE_SELECTIONS).toEqual([
        "king",
        "queen",
        "rook",
        "bishop",
        "knight",
        "random",
      ]);
    });

    it("accepts every piece selection", () => {
      for (const selectedPiece of LEGAL_MOVES_PIECE_SELECTIONS) {
        expect(definition.parseSettings({ selectedPiece })).toEqual({
          selectedPiece,
        });
      }
    });

    it("rejects a selection outside the enum, so no arbitrary leaderboard key can be made", () => {
      expect(definition.parseSettings({ selectedPiece: "pawn" })).toBeNull();
      expect(definition.parseSettings({ selectedPiece: "k" })).toBeNull();
      expect(definition.parseSettings({})).toBeNull();
    });

    it("rejects non-objects", () => {
      expect(definition.parseSettings(null)).toBeNull();
      expect(definition.parseSettings(undefined)).toBeNull();
      expect(definition.parseSettings("king")).toBeNull();
    });
  });

  it("keys the leaderboard by selection, as existing rankings are keyed", () => {
    expect(definition.leaderboardKey({ selectedPiece: "bishop" })).toBe(
      "bishop",
    );
  });

  describe("generateQuestions", () => {
    it("returns count questions", () => {
      expect(
        definition.generateQuestions(
          { selectedPiece: "random" },
          182,
          seededRng(1),
        ),
      ).toHaveLength(182);
    });

    it("draws the same sequence as generateBalancedMoveQuestions for the selected pieces", () => {
      expect(
        definition.generateQuestions(
          { selectedPiece: "random" },
          60,
          seededRng(42),
        ),
      ).toEqual(
        generateBalancedMoveQuestions(
          60,
          ["k", "q", "r", "b", "n"],
          seededRng(42),
        ),
      );
    });

    it("asks only about the named piece", () => {
      const questions = definition.generateQuestions(
        { selectedPiece: "rook" },
        40,
        seededRng(3),
      );
      expect(questions.every((q) => q.piece === "r")).toBe(true);
    });
  });

  describe("grading", () => {
    const legal = { from: "a1", to: "a8", piece: "r" } as const;

    it("grades a true claim about a legal move correct", () => {
      const answer = definition.parseAnswer(true);
      expect(answer).toBe(true);
      expect(definition.grade(legal, answer!)).toBe(true);
    });

    it("parses a false claim and grades it incorrect for a legal move", () => {
      const answer = definition.parseAnswer(false);
      expect(answer).toBe(false);
      expect(definition.grade(legal, answer!)).toBe(false);
    });

    it("returns null only for a non-boolean", () => {
      expect(definition.parseAnswer("true")).toBeNull();
      expect(definition.parseAnswer(1)).toBeNull();
      expect(definition.parseAnswer(null)).toBeNull();
    });
  });

  it("flashes feedback for 500 ms after either answer", () => {
    expect(definition.feedbackMs({ selectedPiece: "king" }, true)).toBe(500);
    expect(definition.feedbackMs({ selectedPiece: "king" }, false)).toBe(500);
  });

  it("allows 350 ms mean thinking time and 182 questions", () => {
    expect(definition.minMeanThinkMs).toBe(350);
    expect(definition.maxQuestions).toBe(182);
  });
});

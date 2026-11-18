import type { Square } from "@blindfold-chess/types";
import { describe, expect, it } from "vitest";

import type { RandomSource } from "../common/utils";
import {
  COORDINATE_RECENT_SQUARE_WINDOW,
  coordinateQuizChallengeDefinition as definition,
} from "./challenge";
import { generateSingleQuestion } from "./logic";

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

describe("coordinateQuizChallengeDefinition", () => {
  describe("parseSettings", () => {
    it("accepts enum members for orientation and feedback speed", () => {
      expect(
        definition.parseSettings({
          boardOrientation: "random",
          feedbackSpeed: "fast",
        }),
      ).toEqual({ boardOrientation: "random", feedbackSpeed: "fast" });
    });

    it("rejects an orientation outside the enum, so no arbitrary leaderboard key can be made", () => {
      expect(
        definition.parseSettings({
          boardOrientation: "sideways",
          feedbackSpeed: "fast",
        }),
      ).toBeNull();
    });

    it("rejects a missing or unknown feedback speed", () => {
      expect(
        definition.parseSettings({ boardOrientation: "white" }),
      ).toBeNull();
      expect(
        definition.parseSettings({
          boardOrientation: "white",
          feedbackSpeed: "instant",
        }),
      ).toBeNull();
    });

    it("rejects non-objects", () => {
      expect(definition.parseSettings(null)).toBeNull();
      expect(definition.parseSettings(undefined)).toBeNull();
      expect(definition.parseSettings("white")).toBeNull();
      expect(definition.parseSettings(["white", "fast"])).toBeNull();
    });
  });

  it("keys the leaderboard by orientation, as existing rankings are keyed", () => {
    expect(
      definition.leaderboardKey({
        boardOrientation: "black",
        feedbackSpeed: "slow",
      }),
    ).toBe("black");
  });

  describe("generateQuestions", () => {
    const settings = {
      boardOrientation: "random",
      feedbackSpeed: "normal",
    } as const;

    it("returns count questions", () => {
      expect(
        definition.generateQuestions(settings, 144, seededRng(1)),
      ).toHaveLength(144);
    });

    it("draws the same sequence as generateSingleQuestion with the last 8 targets excluded", () => {
      const expectedRng = seededRng(42);
      const expected = [];
      let recent: Square[] = [];
      for (let i = 0; i < 50; i++) {
        const question = generateSingleQuestion("random", recent, expectedRng);
        recent = [question.targetSquare, ...recent].slice(0, 8);
        expected.push(question);
      }

      expect(definition.generateQuestions(settings, 50, seededRng(42))).toEqual(
        expected,
      );
    });

    it("never repeats a target within the recent window", () => {
      const questions = definition.generateQuestions(
        settings,
        144,
        seededRng(7),
      );
      questions.forEach((question, i) => {
        const window = questions
          .slice(Math.max(0, i - COORDINATE_RECENT_SQUARE_WINDOW), i)
          .map((q) => q.targetSquare);
        expect(window).not.toContain(question.targetSquare);
      });
    });
  });

  describe("grading", () => {
    const question = { targetSquare: "e4", orientation: "white" } as const;

    it("grades the target square correct", () => {
      const answer = definition.parseAnswer("e4");
      expect(answer).toBe("e4");
      expect(definition.grade(question, answer!)).toBe(true);
    });

    it("parses another real square and grades it incorrect", () => {
      const answer = definition.parseAnswer("d5");
      expect(answer).toBe("d5");
      expect(definition.grade(question, answer!)).toBe(false);
    });

    it("returns null only for a value that is not a square", () => {
      expect(definition.parseAnswer("z9")).toBeNull();
      expect(definition.parseAnswer(42)).toBeNull();
      expect(definition.parseAnswer(undefined)).toBeNull();
    });
  });

  it("uses the chosen feedback speed for the flash", () => {
    expect(
      definition.feedbackMs(
        { boardOrientation: "white", feedbackSpeed: "slow" },
        false,
      ),
    ).toBe(900);
  });

  it("allows 450 ms mean thinking time and 144 questions", () => {
    expect(definition.minMeanThinkMs).toBe(450);
    expect(definition.maxQuestions).toBe(144);
  });
});

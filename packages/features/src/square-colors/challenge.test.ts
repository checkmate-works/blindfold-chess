import { describe, expect, it } from "vitest";

import { type RandomSource, generateSquareSequence } from "../common/utils";
import { squareColorsChallengeDefinition as definition } from "./challenge";

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

describe("squareColorsChallengeDefinition", () => {
  describe("parseSettings", () => {
    it("normalises any object to empty settings", () => {
      expect(definition.parseSettings({})).toEqual({});
      expect(definition.parseSettings({ extra: "ignored" })).toEqual({});
    });

    it("rejects non-objects", () => {
      expect(definition.parseSettings(null)).toBeNull();
      expect(definition.parseSettings("default")).toBeNull();
      expect(definition.parseSettings([])).toBeNull();
    });
  });

  it("puts every run on the single default leaderboard", () => {
    expect(definition.leaderboardKey({})).toBe("default");
  });

  describe("generateQuestions", () => {
    it("returns count questions", () => {
      expect(definition.generateQuestions({}, 210, seededRng(1))).toHaveLength(
        210,
      );
    });

    it("draws the same sequence as generateSquareSequence", () => {
      expect(definition.generateQuestions({}, 100, seededRng(42))).toEqual(
        generateSquareSequence(100, seededRng(42)),
      );
    });
  });

  describe("grading", () => {
    it("grades the square's colour correct", () => {
      const answer = definition.parseAnswer("dark");
      expect(answer).toBe("dark");
      expect(definition.grade("a1", answer!)).toBe(true);
    });

    it("parses the other colour and grades it incorrect", () => {
      const answer = definition.parseAnswer("light");
      expect(answer).toBe("light");
      expect(definition.grade("a1", answer!)).toBe(false);
    });

    it("returns null only for a value that is not a colour", () => {
      expect(definition.parseAnswer("blue")).toBeNull();
      expect(definition.parseAnswer(true)).toBeNull();
      expect(definition.parseAnswer(null)).toBeNull();
    });
  });

  it("flashes feedback for 500 ms after either answer", () => {
    expect(definition.feedbackMs({}, true)).toBe(500);
    expect(definition.feedbackMs({}, false)).toBe(500);
  });

  it("allows 300 ms mean thinking time and 210 questions", () => {
    expect(definition.minMeanThinkMs).toBe(300);
    expect(definition.maxQuestions).toBe(210);
  });
});

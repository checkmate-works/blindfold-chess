import { describe, expect, it } from "vitest";

import type { PracticeMode } from "../common/types";

import {
  DEFAULT_SQUARE_COLORS_SETTINGS,
  type SquareColorsSettings,
} from "./types";

describe("SquareColorsSettings types", () => {
  describe("DEFAULT_SQUARE_COLORS_SETTINGS", () => {
    it("has timeLimit of 60", () => {
      expect(DEFAULT_SQUARE_COLORS_SETTINGS.timeLimit).toBe(60);
    });

    it('has mode of "timed" as default', () => {
      expect(DEFAULT_SQUARE_COLORS_SETTINGS.mode).toBe("timed");
    });

    it("contains only expected keys", () => {
      const keys = Object.keys(DEFAULT_SQUARE_COLORS_SETTINGS);
      expect(keys).toContain("timeLimit");
      expect(keys).toContain("mode");
      expect(keys).toHaveLength(2);
    });
  });

  describe("PracticeMode type", () => {
    it('accepts "timed" as a valid mode', () => {
      const mode: PracticeMode = "timed";
      expect(mode).toBe("timed");
    });

    it('accepts "training" as a valid mode', () => {
      const mode: PracticeMode = "training";
      expect(mode).toBe("training");
    });

    it('accepts "rush" as a valid mode', () => {
      const mode: PracticeMode = "rush";
      expect(mode).toBe("rush");
    });
  });

  describe("SquareColorsSettings type", () => {
    it("can be constructed with timed mode", () => {
      const settings: SquareColorsSettings = {
        timeLimit: 30,
        mode: "timed",
      };
      expect(settings.timeLimit).toBe(30);
      expect(settings.mode).toBe("timed");
    });

    it("can be constructed with training mode", () => {
      const settings: SquareColorsSettings = {
        timeLimit: 60,
        mode: "training",
      };
      expect(settings.timeLimit).toBe(60);
      expect(settings.mode).toBe("training");
    });
  });
});

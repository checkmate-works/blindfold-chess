import { describe, expect, it } from "vitest";

import { differsFromStart } from "./session-changes";

const PREFS = JSON.stringify({ boardVisibility: "never" });
const OTHER_PREFS = JSON.stringify({ boardVisibility: "always" });

describe("differsFromStart", () => {
  describe("a resumed game", () => {
    const start = { moves: ["e4", "e5"], prefsKey: PREFS };

    it("has nothing to write when opened and left as it was", () => {
      expect(
        differsFromStart(start, { moves: ["e4", "e5"], prefsKey: PREFS }),
      ).toBe(false);
    });

    it("differs once a move is played", () => {
      expect(
        differsFromStart(start, {
          moves: ["e4", "e5", "Nf3"],
          prefsKey: PREFS,
        }),
      ).toBe(true);
    });

    it("differs once a move is taken back", () => {
      expect(differsFromStart(start, { moves: ["e4"], prefsKey: PREFS })).toBe(
        true,
      );
    });

    it("differs when a move was replaced by another, at the same count", () => {
      expect(
        differsFromStart(start, { moves: ["e4", "c5"], prefsKey: PREFS }),
      ).toBe(true);
    });

    it("differs once it is resigned without a move", () => {
      expect(
        differsFromStart(start, {
          moves: ["e4", "e5"],
          result: "loss",
          prefsKey: PREFS,
        }),
      ).toBe(true);
    });

    it("differs once its preferences are changed mid-game", () => {
      expect(
        differsFromStart(start, { moves: ["e4", "e5"], prefsKey: OTHER_PREFS }),
      ).toBe(true);
    });
  });

  describe("a new game", () => {
    const start = { moves: [], prefsKey: PREFS };

    it("has nothing to write before its first move", () => {
      expect(differsFromStart(start, { moves: [], prefsKey: PREFS })).toBe(
        false,
      );
    });

    it("differs once the first move is played", () => {
      expect(differsFromStart(start, { moves: ["e4"], prefsKey: PREFS })).toBe(
        true,
      );
    });

    it("leaves no row when resigned or re-configured before any move", () => {
      expect(
        differsFromStart(start, { moves: [], result: "loss", prefsKey: PREFS }),
      ).toBe(false);
      expect(
        differsFromStart(start, { moves: [], prefsKey: OTHER_PREFS }),
      ).toBe(false);
    });
  });
});

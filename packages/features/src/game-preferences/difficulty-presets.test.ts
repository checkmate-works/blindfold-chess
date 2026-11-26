import { describe, expect, it } from "vitest";

import { DEFAULT_GAME_PREFERENCES } from "./defaults";
import {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  matchDifficultyPreset,
} from "./difficulty-presets";

describe("matchDifficultyPreset", () => {
  it("finds each rung from its own settings", () => {
    for (const level of DIFFICULTY_LEVELS) {
      expect(matchDifficultyPreset(DIFFICULTY_PRESETS[level])).toBe(level);
    }
  });

  it("reads the out-of-the-box preferences as level 2", () => {
    expect(matchDifficultyPreset(DEFAULT_GAME_PREFERENCES)).toBe(2);
  });

  it("ignores the piece fields once the board is never shown", () => {
    expect(
      matchDifficultyPreset({
        ...DIFFICULTY_PRESETS[5],
        showOpponentPieces: false,
        pieceShapeMode: "circles-all",
      }),
    ).toBe(5);
  });

  it("reads a combination on no rung as custom", () => {
    expect(
      matchDifficultyPreset({
        ...DIFFICULTY_PRESETS[2],
        pieceShapeMode: "circles-all",
      }),
    ).toBeNull();
  });
});

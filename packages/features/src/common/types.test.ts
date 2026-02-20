import { describe, expect, it } from "vitest";

import { DEFAULT_BOARD_SYMMETRY_SETTINGS } from "../board-symmetry/types";
import { DEFAULT_QUIZ_SETTINGS } from "../coordinate-quiz/types";
import { DEFAULT_DIAGONAL_QUIZ_SETTINGS } from "../diagonal-quiz/types";
import { DEFAULT_LEGAL_MOVES_SETTINGS } from "../legal-moves/types";
import {
  DEFAULT_SQUARE_COLORS_SETTINGS,
  type SquareColorsResult,
} from "../square-colors/types";
import type {
  BasePracticeResult,
  BasePracticeSettings,
  PracticeMode,
} from "./types";

// ============================================================
// BasePracticeSettings - all modules' defaults must have timeLimit & mode
// ============================================================
describe("BasePracticeSettings", () => {
  const allDefaults: { name: string; settings: BasePracticeSettings }[] = [
    {
      name: "CoordinateQuizSettings",
      settings: DEFAULT_QUIZ_SETTINGS,
    },
    {
      name: "DiagonalQuizSettings",
      settings: DEFAULT_DIAGONAL_QUIZ_SETTINGS,
    },
    {
      name: "SquareColorsSettings",
      settings: DEFAULT_SQUARE_COLORS_SETTINGS,
    },
    {
      name: "LegalMovesSettings",
      settings: DEFAULT_LEGAL_MOVES_SETTINGS,
    },
    {
      name: "BoardSymmetrySettings",
      settings: DEFAULT_BOARD_SYMMETRY_SETTINGS,
    },
  ];

  it.each(allDefaults)(
    "$name default has a numeric timeLimit",
    ({ settings }) => {
      expect(typeof settings.timeLimit).toBe("number");
      expect(settings.timeLimit).toBeGreaterThan(0);
    },
  );

  it.each(allDefaults)(
    '$name default has mode "timed" or "training"',
    ({ settings }) => {
      expect(["timed", "training"]).toContain(settings.mode);
    },
  );

  it.each(allDefaults)(
    "$name default does not contain a 'duration' field (renamed to timeLimit)",
    ({ settings }) => {
      expect(settings).not.toHaveProperty("duration");
    },
  );
});

// ============================================================
// PracticeMode type
// ============================================================
describe("PracticeMode", () => {
  it('accepts "timed" as a valid mode', () => {
    const mode: PracticeMode = "timed";
    expect(mode).toBe("timed");
  });

  it('accepts "training" as a valid mode', () => {
    const mode: PracticeMode = "training";
    expect(mode).toBe("training");
  });
});

// ============================================================
// BasePracticeResult subtype extension
// ============================================================
describe("BasePracticeResult subtype extension", () => {
  it("SquareColorsResult extends BasePracticeResult with incorrectAnswers", () => {
    const result: SquareColorsResult = {
      correctAnswers: 10,
      totalQuestions: 15,
      accuracy: 66.7,
      timeTaken: 30,
      averageTime: 2,
      incorrectAnswers: 5,
    };

    // Verify base fields
    const base: BasePracticeResult = result;
    expect(base.correctAnswers).toBe(10);
    expect(base.totalQuestions).toBe(15);
    expect(base.accuracy).toBe(66.7);
    expect(base.timeTaken).toBe(30);
    expect(base.averageTime).toBe(2);

    // Verify extended field
    expect(result.incorrectAnswers).toBe(5);
  });
});

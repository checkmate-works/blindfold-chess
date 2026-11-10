import { describe, expect, it } from "vitest";

import { PRESET_POSITION_COUNT } from "./problems";
import {
  DEFAULT_FEN_SETTINGS,
  MAX_FEN_COUNT,
  parseCustomFenLines,
  validateCustomFenInput,
} from "./settings";

const VALID = "4k3/8/8/8/8/8/4p3/K7 w - - 0 1";

describe("fen-practice settings", () => {
  it("defaults to every preset, shuffled", () => {
    expect(DEFAULT_FEN_SETTINGS.problemCount).toBe(PRESET_POSITION_COUNT);
    expect(DEFAULT_FEN_SETTINGS.shuffleProblems).toBe(true);
    expect(DEFAULT_FEN_SETTINGS.useCustomFen).toBe(false);
  });

  it("drops blank lines and trims the rest", () => {
    expect(parseCustomFenLines(`  ${VALID}  \n\n \n${VALID}\n`)).toEqual([
      VALID,
      VALID,
    ]);
  });

  it("accepts an empty list without an error", () => {
    expect(validateCustomFenInput("  \n ")).toBeNull();
  });

  it("accepts well-formed FENs", () => {
    expect(validateCustomFenInput(`${VALID}\n${VALID}`)).toBeNull();
  });

  it("reports the 1-based non-blank lines that are not FENs", () => {
    expect(validateCustomFenInput(`${VALID}\n\nnope\n${VALID}\nbad`)).toEqual({
      kind: "invalidLines",
      lines: [2, 4],
    });
  });

  it("rejects more than the maximum number of FENs", () => {
    const input = Array.from({ length: MAX_FEN_COUNT + 1 }, () => VALID).join(
      "\n",
    );
    expect(validateCustomFenInput(input)).toEqual({
      kind: "tooMany",
      max: MAX_FEN_COUNT,
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  MOVE_INPUT_METHODS,
  isMoveOperationLog,
  isStringArray,
} from "./move-operation-log";

const MINIMAL = { inputMethod: "text", peekCount: 0, undoCount: 0 };

describe("isStringArray", () => {
  it("accepts an empty array and an array of strings", () => {
    expect(isStringArray([])).toBe(true);
    expect(isStringArray(["Nf3", "e5"])).toBe(true);
  });

  it("rejects a non-array and an array holding a non-string", () => {
    expect(isStringArray("Nf3")).toBe(false);
    expect(isStringArray({ 0: "Nf3", length: 1 })).toBe(false);
    expect(isStringArray(["Nf3", 1])).toBe(false);
  });
});

describe("MOVE_INPUT_METHODS", () => {
  // Stored games carry these strings, so renaming one would make every record
  // that used it fail validation and be discarded.
  it("names the input methods stored records use", () => {
    expect(MOVE_INPUT_METHODS).toEqual([
      "text",
      "text-autocomplete",
      "select",
      "button",
      "board",
    ]);
  });
});

describe("isMoveOperationLog", () => {
  it("accepts a record carrying only the required fields", () => {
    expect(isMoveOperationLog(MINIMAL)).toBe(true);
  });

  it("accepts every input method in the vocabulary", () => {
    for (const inputMethod of MOVE_INPUT_METHODS) {
      expect(isMoveOperationLog({ ...MINIMAL, inputMethod })).toBe(true);
    }
  });

  it("rejects an input method outside the vocabulary, or none", () => {
    expect(isMoveOperationLog({ ...MINIMAL, inputMethod: "voice" })).toBe(
      false,
    );
    expect(isMoveOperationLog({ ...MINIMAL, inputMethod: undefined })).toBe(
      false,
    );
  });

  it("rejects null and non-object values", () => {
    expect(isMoveOperationLog(null)).toBe(false);
    expect(isMoveOperationLog(undefined)).toBe(false);
    expect(isMoveOperationLog("text")).toBe(false);
    expect(isMoveOperationLog(0)).toBe(false);
  });

  it("requires numeric peek and undo counts", () => {
    expect(isMoveOperationLog({ ...MINIMAL, peekCount: "0" })).toBe(false);
    expect(isMoveOperationLog({ ...MINIMAL, peekCount: undefined })).toBe(
      false,
    );
    expect(isMoveOperationLog({ ...MINIMAL, undoCount: "0" })).toBe(false);
    expect(isMoveOperationLog({ ...MINIMAL, undoCount: undefined })).toBe(
      false,
    );
  });

  it("accepts the optional counters when they are numbers", () => {
    expect(
      isMoveOperationLog({ ...MINIMAL, movePeekCount: 2, invalidCount: 1 }),
    ).toBe(true);
  });

  it("rejects an optional counter that is present but not a number", () => {
    expect(isMoveOperationLog({ ...MINIMAL, movePeekCount: "2" })).toBe(false);
    expect(isMoveOperationLog({ ...MINIMAL, invalidCount: "1" })).toBe(false);
  });

  it("checks invalidAttempts is a string array when present", () => {
    expect(isMoveOperationLog({ ...MINIMAL, invalidAttempts: ["Nf3"] })).toBe(
      true,
    );
    expect(isMoveOperationLog({ ...MINIMAL, invalidAttempts: [1] })).toBe(
      false,
    );
    expect(isMoveOperationLog({ ...MINIMAL, invalidAttempts: "Nf3" })).toBe(
      false,
    );
  });

  it("accepts invalidAttemptSquares mixing square pairs and null slots", () => {
    expect(
      isMoveOperationLog({
        ...MINIMAL,
        invalidAttemptSquares: [{ from: "e2", to: "e5" }, null],
      }),
    ).toBe(true);
  });

  it("rejects invalidAttemptSquares that is not an array", () => {
    expect(
      isMoveOperationLog({
        ...MINIMAL,
        invalidAttemptSquares: { from: "e2", to: "e5" },
      }),
    ).toBe(false);
  });

  it("rejects an invalidAttemptSquares slot missing a square or not an object", () => {
    expect(
      isMoveOperationLog({
        ...MINIMAL,
        invalidAttemptSquares: [{ from: "e2" }],
      }),
    ).toBe(false);
    expect(
      isMoveOperationLog({
        ...MINIMAL,
        invalidAttemptSquares: [{ to: "e5" }],
      }),
    ).toBe(false);
    expect(
      isMoveOperationLog({
        ...MINIMAL,
        invalidAttemptSquares: [{ from: "e2", to: 5 }],
      }),
    ).toBe(false);
    expect(
      isMoveOperationLog({ ...MINIMAL, invalidAttemptSquares: ["e2e5"] }),
    ).toBe(false);
    expect(
      isMoveOperationLog({ ...MINIMAL, invalidAttemptSquares: [undefined] }),
    ).toBe(false);
  });

  it("rejects invalidAttemptSquares when any one slot is malformed", () => {
    expect(
      isMoveOperationLog({
        ...MINIMAL,
        invalidAttemptSquares: [{ from: "e2", to: "e5" }, { from: "e2" }],
      }),
    ).toBe(false);
  });
});

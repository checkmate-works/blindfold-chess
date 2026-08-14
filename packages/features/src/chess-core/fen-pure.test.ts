import { describe, expect, it } from "vitest";

import { fullmoveNumberFromFen, isBlackToMoveFromFen } from "./fen-pure";

/**
 * The fullmove cases came from the puzzle screen's own `getFullmoveFromFen`,
 * which duplicated this accessor. Kept here so the shared version stays held
 * to the fallback behaviour its callers were relying on.
 */
describe("fullmoveNumberFromFen", () => {
  it("reads the 6th FEN field", () => {
    expect(fullmoveNumberFromFen("8/8/8/8/8/8/8/8 w - - 0 23")).toBe(23);
  });

  it("falls back to 1 when the field is missing or malformed", () => {
    expect(fullmoveNumberFromFen("8/8/8/8/8/8/8/8 w - -")).toBe(1);
    expect(fullmoveNumberFromFen("8/8/8/8/8/8/8/8 w - - 0 zero")).toBe(1);
  });

  it("falls back to 1 for a zero fullmove, which no legal FEN carries", () => {
    expect(fullmoveNumberFromFen("8/8/8/8/8/8/8/8 w - - 0 0")).toBe(1);
  });
});

describe("isBlackToMoveFromFen", () => {
  it("reads the side-to-move field", () => {
    expect(isBlackToMoveFromFen("8/8/8/8/8/8/8/8 b - - 0 1")).toBe(true);
    expect(isBlackToMoveFromFen("8/8/8/8/8/8/8/8 w - - 0 1")).toBe(false);
  });

  it("treats a FEN with no side-to-move field as white to move", () => {
    expect(isBlackToMoveFromFen("8/8/8/8/8/8/8/8")).toBe(false);
  });
});

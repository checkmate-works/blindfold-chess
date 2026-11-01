import { describe, expect, it } from "vitest";

import {
  STARTING_FEN,
  fullmoveNumberFromFen,
  isBlackToMoveFromFen,
  withSideToMove,
} from "./fen-pure";

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

describe("withSideToMove", () => {
  it("overwrites the side-to-move field and keeps the rest", () => {
    expect(withSideToMove("8/8/8/8/8/8/8/8 w KQ - 3 12", "b")).toBe(
      "8/8/8/8/8/8/8/8 b KQ - 3 12",
    );
  });

  it("normalizes irregular whitespace before locating the field", () => {
    expect(withSideToMove("  8/8/8/8/8/8/8/8   w  - - 0 1 ", "b")).toBe(
      "8/8/8/8/8/8/8/8 b - - 0 1",
    );
  });

  it("returns a placement-only FEN unchanged", () => {
    expect(withSideToMove("8/8/8/8/8/8/8/8", "b")).toBe("8/8/8/8/8/8/8/8");
  });
});

describe("STARTING_FEN", () => {
  it("is the position chess.js starts a game from", async () => {
    // The constant lives in the chess.js-free module so callers can read it
    // without the library; this is what keeps that copy honest.
    const { DEFAULT_POSITION } = await import("chess.js");
    expect(STARTING_FEN).toBe(DEFAULT_POSITION);
  });
});

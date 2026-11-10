import { describe, expect, it } from "vitest";

import { EMPTY_BOARD_FEN, applyBoardTap, setSquarePiece } from "./board-edit";

describe("setSquarePiece", () => {
  it("places a piece and keeps the remaining FEN fields", () => {
    expect(setSquarePiece("8/8/8/8/8/8/8/8 b - - 3 40", "e4", "Q")).toBe(
      "8/8/8/8/4Q3/8/8/8 b - - 3 40",
    );
  });

  it("empties a square", () => {
    expect(setSquarePiece("8/8/8/8/4Q3/8/8/8 w - - 0 1", "e4", null)).toBe(
      EMPTY_BOARD_FEN,
    );
  });

  it("ignores a square that is not on the board", () => {
    expect(setSquarePiece(EMPTY_BOARD_FEN, "z9", "K")).toBe(EMPTY_BOARD_FEN);
  });
});

describe("applyBoardTap", () => {
  it("places the selected piece, replacing whatever stood there", () => {
    const withRook = setSquarePiece(EMPTY_BOARD_FEN, "a1", "r");
    expect(applyBoardTap(withRook, "a1", "K")).toBe(
      "8/8/8/8/8/8/8/K7 w - - 0 1",
    );
  });

  it("toggles the piece off when the same piece is tapped again", () => {
    const once = applyBoardTap(EMPTY_BOARD_FEN, "h8", "k");
    expect(once).toBe("7k/8/8/8/8/8/8/8 w - - 0 1");
    expect(applyBoardTap(once, "h8", "k")).toBe(EMPTY_BOARD_FEN);
  });

  it("erases when no piece is selected", () => {
    const withPawn = setSquarePiece(EMPTY_BOARD_FEN, "d2", "P");
    expect(applyBoardTap(withPawn, "d2", null)).toBe(EMPTY_BOARD_FEN);
  });
});

import { describe, expect, it } from "vitest";

import { fenToPieceList } from "../fen";

describe("fenToPieceList", () => {
  it("converts starting position", () => {
    const result = fenToPieceList(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );
    expect(result.white).toEqual([
      "Ke1",
      "Qd1",
      "Ra1",
      "Rh1",
      "Bc1",
      "Bf1",
      "Nb1",
      "Ng1",
      "a2",
      "b2",
      "c2",
      "d2",
      "e2",
      "f2",
      "g2",
      "h2",
    ]);
    expect(result.black).toEqual([
      "Ke8",
      "Qd8",
      "Ra8",
      "Rh8",
      "Bc8",
      "Bf8",
      "Nb8",
      "Ng8",
      "a7",
      "b7",
      "c7",
      "d7",
      "e7",
      "f7",
      "g7",
      "h7",
    ]);
  });

  it("converts a simple endgame position", () => {
    const result = fenToPieceList("7R/5k2/5p2/5K2/8/8/8/8 w - - 0 1");
    expect(result.white).toEqual(["Kf5", "Rh8"]);
    expect(result.black).toEqual(["Kf7", "f6"]);
  });

  it("returns empty arrays for an empty board", () => {
    const result = fenToPieceList("8/8/8/8/8/8/8/8 w - - 0 1");
    expect(result.white).toEqual([]);
    expect(result.black).toEqual([]);
  });

  it("handles a pawns-only position", () => {
    const result = fenToPieceList("8/pp6/8/8/8/8/PP6/8 w - - 0 1");
    expect(result.white).toEqual(["a2", "b2"]);
    expect(result.black).toEqual(["a7", "b7"]);
  });

  it("sorts pieces in correct order: K > Q > R > B > N > pawns", () => {
    // White has one of each piece type, scattered across the board
    const result = fenToPieceList("8/8/8/8/8/N1B1R1Q1/1P6/4K3 w - - 0 1");
    expect(result.white).toEqual(["Ke1", "Qg3", "Re3", "Bc3", "Na3", "b2"]);
  });

  it("sorts pieces of the same type alphabetically by square", () => {
    // Two rooks, two bishops — check sub-sorting
    const result = fenToPieceList("8/8/8/8/8/8/8/R1B2BKR w - - 0 1");
    expect(result.white).toEqual(["Kg1", "Ra1", "Rh1", "Bc1", "Bf1"]);
  });

  it("handles FEN without game state suffix (piece placement only)", () => {
    const result = fenToPieceList("7R/5k2/5p2/5K2/8/8/8/8");
    expect(result.white).toEqual(["Kf5", "Rh8"]);
    expect(result.black).toEqual(["Kf7", "f6"]);
  });
});

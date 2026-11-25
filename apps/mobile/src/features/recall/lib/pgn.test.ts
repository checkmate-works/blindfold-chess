import { describe, expect, it } from "vitest";

import { defaultSideFor, readRecallPgn } from "./pgn";

describe("readRecallPgn", () => {
  it("rejects an empty or unreadable PGN", () => {
    expect(readRecallPgn("  ")).toBeNull();
    expect(readRecallPgn("1. e4 e5 2. Ke3 Ke6 3. Qx9")).toBeNull();
  });

  it("reads the moves and numbering from the standard start", () => {
    const game = readRecallPgn("1. e4 e5 2. Nf3");
    expect(game).toMatchObject({
      moves: ["e4", "e5", "Nf3"],
      hasFen: false,
      firstMover: "white",
      startMoveNumber: 1,
    });
  });
});

describe("defaultSideFor", () => {
  it("picks the side to move after the last move", () => {
    expect(defaultSideFor(readRecallPgn("1. e4 e5 2. Nf3")!)).toBe("black");
    expect(defaultSideFor(readRecallPgn("1. e4 e5")!)).toBe("white");
  });
});

import { describe, expect, it } from "vitest";

import {
  LICHESS_PGN_PATH_LIMIT,
  STARTING_FEN,
  fullmoveNumberFromFen,
  isBlackToMoveFromFen,
  movesToLichessUrl,
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

describe("movesToLichessUrl", () => {
  const url = (...args: Parameters<typeof movesToLichessUrl>) =>
    movesToLichessUrl(...args).url;

  it("joins the SAN with underscores and opens at the last move by default", () => {
    expect(movesToLichessUrl(["e4", "e5", "Nf3"])).toEqual({
      url: "https://lichess.org/analysis/pgn/e4_e5_Nf3#3",
      includedMoves: 3,
      truncated: false,
    });
  });

  it("opens at the requested ply, clamped to the move list", () => {
    expect(url(["e4", "e5", "Nf3"], { plies: 1 })).toMatch(/#1$/);
    expect(url(["e4", "e5", "Nf3"], { plies: 0 })).toMatch(/#0$/);
    expect(url(["e4", "e5", "Nf3"], { plies: 9 })).toMatch(/#3$/);
  });

  // `+` would become a space on Lichess and `#` would start the URL hash.
  it("drops check and mate markers", () => {
    expect(url(["f3", "e5", "g4", "Qh4#"])).toBe(
      "https://lichess.org/analysis/pgn/f3_e5_g4_Qh4#4",
    );
    expect(url(["e4", "f5", "Qh5+"])).toBe(
      "https://lichess.org/analysis/pgn/e4_f5_Qh5#3",
    );
  });

  it("omits the FEN header for the standard start", () => {
    expect(url(["d4"], { startingFen: STARTING_FEN })).toBe(
      "https://lichess.org/analysis/pgn/d4#1",
    );
  });

  // Lichess numbers plies from the start of a standard game, so a position
  // at "move 12, black to move" is ply 23 before any move is played.
  it("sends a custom start as a FEN header and counts plies from it", () => {
    const fen =
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 12";

    expect(url(["Nf6", "Bc4"], { startingFen: fen, plies: 1 })).toBe(
      "https://lichess.org/analysis/pgn/" +
        "%5BFEN_%22r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R_b_KQkq_-_3_12%22%5D_Nf6_Bc4" +
        "#24",
    );
  });

  it("opens an empty game at its starting position", () => {
    expect(url([])).toBe("https://lichess.org/analysis/pgn/#0");
  });

  // Lichess keeps only the first LICHESS_PGN_PATH_LIMIT characters of the
  // path; left to it, the cut would land mid-SAN.
  describe("a game longer than Lichess reads", () => {
    // "Nf3_" etc.: every token is 3 characters plus a separator.
    const longGame = Array.from(
      { length: 2000 },
      (_, i) => ["Nf3", "Nf6", "Ng1", "Ng8"][i % 4],
    );

    it("is cut at a move boundary within the limit", () => {
      const result = movesToLichessUrl(longGame);
      const path = result.url
        .slice("https://lichess.org/analysis/pgn/".length)
        .split("#")[0];

      expect(result.truncated).toBe(true);
      expect(result.includedMoves).toBe(1250);
      expect(path.length).toBeLessThanOrEqual(LICHESS_PGN_PATH_LIMIT);
      expect(path.split("_")).toHaveLength(1250);
    });

    it("opens at the last move sent when the requested one was cut off", () => {
      expect(url(longGame, { plies: 1800 })).toMatch(/#1250$/);
      expect(url(longGame, { plies: 10 })).toMatch(/#10$/);
    });

    it("counts the FEN header against the limit", () => {
      const fen = "8/8/8/8/8/8/8/K6k w - - 0 1";
      const kings = Array.from(
        { length: 2000 },
        (_, i) => ["Kb1", "Kg1", "Ka1", "Kh1"][i % 4],
      );
      const result = movesToLichessUrl(kings, { startingFen: fen });
      const path = result.url
        .slice("https://lichess.org/analysis/pgn/".length)
        .split("#")[0];

      expect(path.length).toBeLessThanOrEqual(LICHESS_PGN_PATH_LIMIT);
      expect(result.includedMoves).toBeLessThan(1250);
    });
  });
});

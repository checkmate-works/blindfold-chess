import { describe, expect, it } from "vitest";

import {
  LICHESS_PGN_PATH_LIMIT,
  STARTING_FEN,
  boardIndexToSquare,
  fenCharToPiece,
  fenToLichessUrl,
  fenToPieceList,
  fenToPlacements,
  fullmoveNumberFromFen,
  getTurnFromFen,
  isBlackToMoveFromFen,
  movesToLichessUrl,
  squareToBoardIndex,
  toPositionKey,
  validateFenFormat,
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

  it("sets the side on a FEN that has only placement and side", () => {
    expect(withSideToMove("8/8/8/8/8/8/8/K6k b", "w")).toBe(
      "8/8/8/8/8/8/8/K6k w",
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

  it("counts plies from a custom start with white to move", () => {
    const fen = "8/8/8/8/8/8/8/K6k w - - 0 5";
    expect(url(["Kb1"], { startingFen: fen, plies: 0 })).toMatch(/#8$/);
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

    // 999 four-character SANs, one five-character SAN and 999 separators.
    const exactlyAtLimit = [...Array<string>(999).fill("Nxf3"), "Nbxd2"];

    it("keeps a game whose path is exactly the limit whole", () => {
      const result = movesToLichessUrl(exactlyAtLimit);
      expect(result.includedMoves).toBe(1000);
      expect(result.truncated).toBe(false);
    });

    it("drops the last move when it would pass the limit by one", () => {
      const result = movesToLichessUrl([...exactlyAtLimit.slice(1), "Nbxd2"]);
      expect(result.includedMoves).toBe(999);
      expect(result.truncated).toBe(true);
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

describe("fenCharToPiece", () => {
  it("reads upper case as white and lower case as black", () => {
    expect(fenCharToPiece("N")).toEqual({ type: "n", color: "w" });
    expect(fenCharToPiece("q")).toEqual({ type: "q", color: "b" });
    for (const ch of "kqrbnp") {
      expect(fenCharToPiece(ch)).toEqual({ type: ch, color: "b" });
      expect(fenCharToPiece(ch.toUpperCase())).toEqual({
        type: ch,
        color: "w",
      });
    }
  });

  it("returns null for anything that is not a single piece letter", () => {
    for (const ch of ["", "3", "/", "x", "X", "kk", "Kq", "nK"]) {
      expect(fenCharToPiece(ch)).toBeNull();
    }
  });
});

describe("fenToPlacements", () => {
  it("lists every piece with its square, rank 8 first", () => {
    expect(fenToPlacements("4k3/8/8/8/8/8/3P4/R3K3 w Q - 0 1")).toEqual([
      { square: "e8", type: "k", color: "b" },
      { square: "d2", type: "p", color: "w" },
      { square: "a1", type: "r", color: "w" },
      { square: "e1", type: "k", color: "w" },
    ]);
  });

  it("returns nothing for an empty board", () => {
    expect(fenToPlacements("8/8/8/8/8/8/8/8 w - - 0 1")).toEqual([]);
  });
});

describe("boardIndexToSquare and squareToBoardIndex", () => {
  it("count from a8 rank by rank down to h1", () => {
    expect(boardIndexToSquare(0)).toBe("a8");
    expect(boardIndexToSquare(7)).toBe("h8");
    expect(boardIndexToSquare(8)).toBe("a7");
    expect(boardIndexToSquare(63)).toBe("h1");
    expect(squareToBoardIndex("a8")).toBe(0);
    expect(squareToBoardIndex("h8")).toBe(7);
    expect(squareToBoardIndex("a7")).toBe(8);
    expect(squareToBoardIndex("h1")).toBe(63);
  });

  it("are inverses over the whole board", () => {
    for (let index = 0; index < 64; index++) {
      expect(squareToBoardIndex(boardIndexToSquare(index))).toBe(index);
    }
  });

  it("returns null for a string that is not a square", () => {
    for (const square of ["", "e", "e44", "i4", "E4", "ex", "e0", "e9"]) {
      expect(squareToBoardIndex(square)).toBeNull();
    }
  });
});

describe("toPositionKey", () => {
  it("keeps the first four fields and drops the clocks", () => {
    expect(toPositionKey(STARTING_FEN)).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
    );
  });
});

describe("getTurnFromFen", () => {
  it("reads the side to move", () => {
    expect(getTurnFromFen(STARTING_FEN)).toBe("w");
    expect(getTurnFromFen("8/8/8/8/8/8/8/K6k b - - 0 1")).toBe("b");
  });

  it("throws on a FEN with fewer than six fields", () => {
    expect(() => getTurnFromFen("8/8/8/8/8/8/8/K6k w - - 0")).toThrow(
      "Invalid FEN: incomplete FEN string",
    );
  });

  it("throws on a turn field that is neither w nor b", () => {
    expect(() => getTurnFromFen("8/8/8/8/8/8/8/K6k x - - 0 1")).toThrow(
      "Invalid FEN: invalid turn field",
    );
  });
});

describe("fenToLichessUrl", () => {
  it("puts the FEN in the analysis path with spaces as underscores", () => {
    expect(fenToLichessUrl(STARTING_FEN)).toBe(
      "https://lichess.org/analysis/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR_w_KQkq_-_0_1",
    );
  });
});

describe("fenToPieceList ordering", () => {
  it("sorts pieces of one type by square, not by where the FEN lists them", () => {
    // The FEN lists h8 before a1 and a7 before e2.
    const result = fenToPieceList("7N/p7/8/8/8/8/4p3/N3K2k w - - 0 1");
    expect(result.white).toEqual(["Ke1", "Na1", "Nh8"]);
    expect(result.black).toEqual(["Kh1", "a7", "e2"]);
  });
});

describe("validateFenFormat", () => {
  const BOARD = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

  it("accepts a board and turn with or without the remaining fields", () => {
    expect(validateFenFormat(STARTING_FEN)).toBe(true);
    expect(validateFenFormat(`${BOARD} w`)).toBe(true);
    expect(validateFenFormat(`${BOARD} b`)).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(validateFenFormat(`  ${STARTING_FEN}  `)).toBe(true);
  });

  it("rejects a FEN without a valid turn", () => {
    expect(validateFenFormat(BOARD)).toBe(false);
    expect(validateFenFormat(`${BOARD} x`)).toBe(false);
  });

  it("rejects a board that does not have eight ranks", () => {
    expect(validateFenFormat("8/8/8/8/8/8/8 w")).toBe(false);
    expect(validateFenFormat("8/8/8/8/8/8/8/8/8 w")).toBe(false);
  });

  it("rejects a rank that does not add up to eight squares", () => {
    expect(validateFenFormat("8/8/8/8/8/8/8/7 w")).toBe(false);
    expect(validateFenFormat("8/8/8/8/8/8/8/K6 w")).toBe(false);
    expect(validateFenFormat("8/8/8/8/8/8/8/9 w")).toBe(false);
  });

  it("rejects a character that is neither a digit nor a piece", () => {
    expect(validateFenFormat("8/8/8/8/8/8/8/X7 w")).toBe(false);
    // Eight squares without the stray character.
    expect(validateFenFormat("8/8/8/8/8/8/8/K7X w")).toBe(false);
  });

  it("accepts consecutive empty-square digits that sum to eight", () => {
    expect(validateFenFormat("8/8/8/8/8/8/8/17 w")).toBe(true);
    expect(validateFenFormat("8/8/8/8/8/8/8/44 w")).toBe(true);
    expect(validateFenFormat("8/8/8/8/8/8/8/K16 w")).toBe(true);
  });

  // Fields are split on single spaces, so a doubled space leaves an empty
  // turn field and a tab glues the turn onto the last rank.
  it("rejects a turn separated by anything but a single space", () => {
    expect(validateFenFormat(`${BOARD}  w`)).toBe(false);
    expect(validateFenFormat(`${BOARD}\tw`)).toBe(false);
  });

  it("does not look past the turn field", () => {
    expect(validateFenFormat(`${BOARD} w KQkq - 0`)).toBe(true);
    expect(validateFenFormat(`${BOARD} w KQkq - 0 1 extra`)).toBe(true);
    expect(validateFenFormat(`${BOARD} w garbage`)).toBe(true);
    expect(validateFenFormat(`${BOARD} w KQkq -  0 1`)).toBe(true);
  });
});

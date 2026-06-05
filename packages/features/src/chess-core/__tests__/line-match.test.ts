import { describe, expect, it } from "vitest";

import { matchGameAgainstLines, matchGameToLine } from "../line-match";
import { parsePgnTree } from "../pgn-tree";

// ============================================================
// White repertoire (player = white)
// ============================================================
describe("matchGameToLine — white repertoire", () => {
  // 1. e4; against 1...e5 reply with 2. Nf3 Nc6 3. Bb5 (Ruy Lopez).
  const ruy = parsePgnTree("1. e4 e5 2. Nf3 Nc6 3. Bb5");

  it("reports in-book when the game follows the prepared line", () => {
    const result = matchGameToLine(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], playerColor: "white" },
      ruy,
    );
    expect(result.status).toBe("in-book");
    expect(result.enteredAtPly).toBe(0);
    expect(result.followedPlies).toBe(5);
    expect(result.divergence).toBeUndefined();
  });

  it("flags a player deviation at the player's own move", () => {
    // Player plays 3. Bc4 (Italian) instead of the prepared 3. Bb5.
    const result = matchGameToLine(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], playerColor: "white" },
      ruy,
    );
    expect(result.status).toBe("deviation");
    expect(result.divergence).toMatchObject({
      ply: 4,
      side: "white",
      played: "Bc4",
      expected: ["Bb5"],
    });
    expect(result.followedPlies).toBe(4);
  });

  it("reports a gap when the opponent leaves the prepared line", () => {
    // Opponent answers 1. e4 with 1... c5 (Sicilian); the tree only knows 1... e5.
    const result = matchGameToLine(
      { moves: ["e4", "c5", "Nf3"], playerColor: "white" },
      ruy,
    );
    expect(result.status).toBe("gap");
    expect(result.divergence).toMatchObject({
      ply: 1,
      side: "black",
      played: "c5",
      expected: ["e5"],
    });
    expect(result.followedPlies).toBe(1);
  });

  it("returns not-applicable when the game never reaches a custom root", () => {
    // A mate pattern rooted at a custom FEN that a normal opening never reaches.
    const fen = "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1";
    const mate = parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. Rd8#`);
    const result = matchGameToLine(
      { moves: ["e4", "e5", "Nf3"], playerColor: "white" },
      mate,
    );
    expect(result.status).toBe("not-applicable");
    expect(result.enteredAtPly).toBeNull();
  });

  it("flags a ply-0 deviation when the game's first move leaves the repertoire", () => {
    // A standard-rooted 1.d4 repertoire applies to every game at ply 0, so a
    // 1.e4 game is a (player) deviation on the very first move — not "n/a".
    const queens = parsePgnTree("1. d4 d5 2. c4");
    const result = matchGameToLine(
      { moves: ["e4", "e5"], playerColor: "white" },
      queens,
    );
    expect(result.status).toBe("deviation");
    expect(result.divergence).toMatchObject({
      ply: 0,
      played: "e4",
      expected: ["d4"],
    });
  });

  it("treats either of two prepared player moves as on-book", () => {
    // After 1. e4 e5 the player has prepared both 2. Nf3 and 2. Bc4.
    const tree = parsePgnTree("1. e4 e5 2. Nf3 (2. Bc4 Bc5) Nc6");
    const viaBc4 = matchGameToLine(
      { moves: ["e4", "e5", "Bc4", "Bc5"], playerColor: "white" },
      tree,
    );
    expect(viaBc4.status).toBe("in-book");
    expect(viaBc4.followedPlies).toBe(4);
  });

  it("follows the correct branch through an opponent variation", () => {
    // Prepared: after 1.e4 e5 2.Nf3, answer 2...Nc6 with 3.Bb5 and 2...Nf6 with 3.Nxe5.
    const tree = parsePgnTree("1. e4 e5 2. Nf3 Nc6 (2... Nf6 3. Nxe5) 3. Bb5");
    const petrov = matchGameToLine(
      { moves: ["e4", "e5", "Nf3", "Nf6", "Nxe5"], playerColor: "white" },
      tree,
    );
    expect(petrov.status).toBe("in-book");
    expect(petrov.followedPlies).toBe(5);
  });
});

// ============================================================
// Black repertoire (player = black)
// ============================================================
describe("matchGameToLine — black repertoire", () => {
  // As black, meet 1. e4 with the Najdorf Sicilian.
  const najdorf = parsePgnTree(
    "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6",
  );

  it("flags a player (black) deviation", () => {
    // Black plays 2... Nc6 instead of the prepared 2... d6.
    const result = matchGameToLine(
      { moves: ["e4", "c5", "Nf3", "Nc6"], playerColor: "black" },
      najdorf,
    );
    expect(result.status).toBe("deviation");
    expect(result.divergence).toMatchObject({
      ply: 3,
      side: "black",
      played: "Nc6",
      expected: ["d6"],
    });
  });

  it("reports a gap when white plays an unprepared first move", () => {
    // White opens 1. d4; the black-vs-e4 repertoire does not cover it.
    const result = matchGameToLine(
      { moves: ["d4", "Nf6", "c4"], playerColor: "black" },
      najdorf,
    );
    expect(result.status).toBe("gap");
    expect(result.divergence).toMatchObject({
      ply: 0,
      side: "white",
      played: "d4",
      expected: ["e4"],
    });
  });

  it("stays in-book when both sides follow the line", () => {
    const result = matchGameToLine(
      {
        moves: [
          "e4",
          "c5",
          "Nf3",
          "d6",
          "d4",
          "cxd4",
          "Nxd4",
          "Nf6",
          "Nc3",
          "a6",
        ],
        playerColor: "black",
      },
      najdorf,
    );
    expect(result.status).toBe("in-book");
    expect(result.followedPlies).toBe(10);
  });
});

// ============================================================
// Non-standard root (mate pattern / middlegame study)
// ============================================================
describe("matchGameToLine — custom-FEN tree attaches mid-game", () => {
  // A tree whose root is the position AFTER 1. e4 e5 2. Nf3 (black to move),
  // continuing 2... Nc6 3. Bb5. A full game from the standard start should
  // attach to it only once it reaches that position (ply 3).
  const midFen =
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";
  const midTree = parsePgnTree(`[SetUp "1"]\n[FEN "${midFen}"]\n\nNc6 Bb5`);

  it("begins matching at the ply the game first reaches the root", () => {
    const result = matchGameToLine(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], playerColor: "white" },
      midTree,
    );
    expect(result.status).toBe("in-book");
    expect(result.enteredAtPly).toBe(3);
    expect(result.followedPlies).toBe(2);
  });

  it("flags a deviation discovered after a mid-game attach", () => {
    const result = matchGameToLine(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], playerColor: "white" },
      midTree,
    );
    expect(result.status).toBe("deviation");
    expect(result.enteredAtPly).toBe(3);
    expect(result.divergence).toMatchObject({
      ply: 4,
      played: "Bc4",
      expected: ["Bb5"],
    });
  });

  it("matches a game that starts from the tree's custom root (mate pattern)", () => {
    // Back-rank mate: white to move, 1. Rd8#.
    const fen = "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1";
    const tree = parsePgnTree(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. Rd8#`);

    const onBook = matchGameToLine(
      { moves: ["Rd8#"], playerColor: "white", startingFen: fen },
      tree,
    );
    expect(onBook.status).toBe("in-book");
    expect(onBook.enteredAtPly).toBe(0);
    expect(onBook.followedPlies).toBe(1);

    const offBook = matchGameToLine(
      { moves: ["Rd2"], playerColor: "white", startingFen: fen },
      tree,
    );
    expect(offBook.status).toBe("deviation");
    expect(offBook.divergence).toMatchObject({
      ply: 0,
      played: "Rd2",
      expected: ["Rd8#"],
    });
  });
});

// ============================================================
// matchGameAgainstLines
// ============================================================
describe("matchGameAgainstLines", () => {
  const ruy = parsePgnTree("1. e4 e5 2. Nf3 Nc6 3. Bb5");
  const italian = parsePgnTree("1. e4 e5 2. Nf3 Nc6 3. Bc4");
  // A custom-FEN mate pattern that a normal opening game never reaches.
  const mate = parsePgnTree(
    '[SetUp "1"]\n[FEN "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"]\n\n1. Rd8#',
  );

  it("returns only the applicable trees, in input order", () => {
    const game = {
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"],
      playerColor: "white" as const,
    };
    const candidates = matchGameAgainstLines(game, [ruy, italian, mate]);
    // The mate-pattern tree's root is never reached and is dropped.
    expect(candidates.map((c) => c.index)).toEqual([0, 1]);
    // Ruy: deviation at 3.Bc4 (prepared 3.Bb5). Italian: fully in-book.
    expect(candidates[0].result.status).toBe("deviation");
    expect(candidates[1].result.status).toBe("in-book");
    expect(candidates[1].result.followedPlies).toBe(5);
  });

  it("returns an empty array when no tree applies", () => {
    // A game that reaches none of the (custom-rooted) trees' positions.
    const game = {
      moves: ["g3", "g6", "Bg2"],
      playerColor: "white" as const,
    };
    expect(matchGameAgainstLines(game, [mate])).toEqual([]);
  });
});

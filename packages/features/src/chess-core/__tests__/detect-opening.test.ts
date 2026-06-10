import { describe, expect, it } from "vitest";

import {
  buildOpeningIndex,
  detectOpening,
  type OpeningEntry,
} from "../detect-opening";
import { getFenAfterMoves, getStartingFen } from "../fen";

/**
 * Build opening entries the same way the seed does: derive each FEN from its
 * SAN move list via chess-core, so the test stays consistent with production.
 */
function opening(id: string, moves: string[]): OpeningEntry {
  return { id, fen: getFenAfterMoves(getStartingFen(), moves) };
}

const ENTRIES: OpeningEntry[] = [
  opening("kings-pawn", ["e4"]),
  opening("ruy-lopez", ["e4", "e5", "Nf3", "Nc6", "Bb5"]),
  opening("ruy-lopez-berlin", ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"]),
  opening("italian-game", ["e4", "e5", "Nf3", "Nc6", "Bc4"]),
  opening("queens-gambit", ["d4", "d5", "c4"]),
  opening("english-opening", ["c4"]),
];

const index = buildOpeningIndex(ENTRIES);

describe("detectOpening", () => {
  it("returns the deepest opening the game passed through, not the first", () => {
    // Passes through kings-pawn → ruy-lopez → ruy-lopez-berlin; the deepest wins.
    const match = detectOpening(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"] },
      index,
    );
    expect(match?.id).toBe("ruy-lopez-berlin");
    expect(match?.ply).toBe(6);
  });

  it("stops at the deepest match when the game leaves book afterwards", () => {
    const match = detectOpening(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6"] },
      index,
    );
    // ...a6/Ba4/Nf6 are not separate entries; ruy-lopez (ply 5) is the deepest hit.
    expect(match?.id).toBe("ruy-lopez");
    expect(match?.ply).toBe(5);
  });

  it("matches transpositions by position, not by move order", () => {
    // Italian reached via 2...Nc6 then 3.Bc4, or by a different order — same FEN.
    const match = detectOpening(
      { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
      index,
    );
    expect(match?.id).toBe("italian-game");
  });

  it("falls back to a shallow opening when no deeper one applies", () => {
    const match = detectOpening({ moves: ["e4", "c5", "Nf3", "d6"] }, index);
    expect(match?.id).toBe("kings-pawn");
    expect(match?.ply).toBe(1);
  });

  it("returns null when no position matches any opening", () => {
    expect(detectOpening({ moves: ["Nh3", "Nh6"] }, index)).toBeNull();
  });

  it("returns null for a game starting from a custom position", () => {
    const customFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";
    expect(
      detectOpening({ moves: ["e5"], startingFen: customFen }, index),
    ).toBeNull();
  });

  it("treats an explicit standard starting FEN the same as omitting it", () => {
    const match = detectOpening(
      { moves: ["c4"], startingFen: getStartingFen() },
      index,
    );
    expect(match?.id).toBe("english-opening");
  });

  it("does not replay beyond the deepest opening (bounded by maxPly)", () => {
    // A long game whose opening is decided in the first few plies still resolves.
    const longGame = {
      moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O"],
    };
    const match = detectOpening(longGame, index);
    expect(match?.id).toBe("queens-gambit");
    expect(match?.ply).toBe(3);
  });
});

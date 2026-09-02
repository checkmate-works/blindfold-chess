import type { AlgebraicNotation } from "@blindfold-chess/types";
import { describe, expect, test } from "vitest";

import { STARTING_FEN } from "./fen-pure";
import { formatLastMove } from "./format";

/**
 * After 1. e4 e5 2. Nf3 — Black to move on move 2. A game resumed here opens
 * with a black half-move, which shifts the white/black pairing by one ply on
 * top of starting the count at 2. Both halves of that are what the hand-rolled
 * arithmetic missed.
 */
const BLACK_TO_MOVE_MIDGAME_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

/**
 * The same line one half-move later, after 2...Nc6 — White to move on move 3.
 * The pairing is the ordinary one; only the number the game opens on differs.
 */
const WHITE_TO_MOVE_MIDGAME_FEN =
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 3 3";

describe("formatLastMove", () => {
  describe("empty moves", () => {
    test('returns "-" for empty moves array', () => {
      expect(formatLastMove([], "white", undefined)).toBe("-");
      expect(formatLastMove([], "black", undefined)).toBe("-");
    });
  });

  describe("white player perspective", () => {
    test("formats single white move correctly", () => {
      const moves: AlgebraicNotation[] = ["e4"];
      expect(formatLastMove(moves, "white", undefined)).toBe("1. e4");
    });

    test("formats first full turn (white and black) correctly", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5"];
      expect(formatLastMove(moves, "white", undefined)).toBe("1. e4 e5");
    });

    test("formats second white move correctly", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3"];
      expect(formatLastMove(moves, "white", undefined)).toBe("2. Nf3");
    });

    test("formats second full turn correctly", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3", "Nc6"];
      expect(formatLastMove(moves, "white", undefined)).toBe("2. Nf3 Nc6");
    });

    test("formats third white move correctly", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3", "Nc6", "Bc4"];
      expect(formatLastMove(moves, "white", undefined)).toBe("3. Bc4");
    });

    test("formats third full turn correctly", () => {
      const moves: AlgebraicNotation[] = [
        "e4",
        "e5",
        "Nf3",
        "Nc6",
        "Bc4",
        "Nf6",
      ];
      expect(formatLastMove(moves, "white", undefined)).toBe("3. Bc4 Nf6");
    });

    test("handles castling moves", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3", "Nc6", "O-O"];
      expect(formatLastMove(moves, "white", undefined)).toBe("3. O-O");
    });

    test("handles capture moves", () => {
      const moves: AlgebraicNotation[] = ["e4", "d5", "exd5"];
      expect(formatLastMove(moves, "white", undefined)).toBe("2. exd5");
    });

    test("handles check and checkmate notation", () => {
      const moves1: AlgebraicNotation[] = ["e4", "e5", "Qh5+"];
      expect(formatLastMove(moves1, "white", undefined)).toBe("2. Qh5+");

      const moves2: AlgebraicNotation[] = ["f3", "e5", "g4", "Qh4#"];
      expect(formatLastMove(moves2, "white", undefined)).toBe("2. g4 Qh4#");
    });

    test("formats longer game correctly", () => {
      const moves: AlgebraicNotation[] = [
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
      ];
      expect(formatLastMove(moves, "white", undefined)).toBe("5. Nc3 a6");
    });
  });

  describe("black player perspective", () => {
    test("formats when white made the only move", () => {
      const moves: AlgebraicNotation[] = ["e4"];
      expect(formatLastMove(moves, "black", undefined)).toBe("1. e4");
    });

    test("formats first black move correctly", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5"];
      expect(formatLastMove(moves, "black", undefined)).toBe("1...e5");
    });

    test("formats when white made second move (after black)", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3"];
      expect(formatLastMove(moves, "black", undefined)).toBe("1...e5 2. Nf3");
    });

    test("formats second black move correctly", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3", "Nc6"];
      expect(formatLastMove(moves, "black", undefined)).toBe("2...Nc6");
    });

    test("formats when white made third move (after second black move)", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3", "Nc6", "Bc4"];
      expect(formatLastMove(moves, "black", undefined)).toBe("2...Nc6 3. Bc4");
    });

    test("formats third black move correctly", () => {
      const moves: AlgebraicNotation[] = [
        "e4",
        "e5",
        "Nf3",
        "Nc6",
        "Bc4",
        "Nf6",
      ];
      expect(formatLastMove(moves, "black", undefined)).toBe("3...Nf6");
    });

    test("formats when white made fourth move (after third black move)", () => {
      const moves: AlgebraicNotation[] = [
        "e4",
        "e5",
        "Nf3",
        "Nc6",
        "Bc4",
        "Nf6",
        "Ng5",
      ];
      expect(formatLastMove(moves, "black", undefined)).toBe("3...Nf6 4. Ng5");
    });

    test("handles castling moves", () => {
      const moves: AlgebraicNotation[] = [
        "e4",
        "e5",
        "Nf3",
        "Nc6",
        "Bc4",
        "O-O",
      ];
      expect(formatLastMove(moves, "black", undefined)).toBe("3...O-O");
    });

    test("handles capture moves", () => {
      const moves: AlgebraicNotation[] = ["e4", "d5", "exd5", "Qxd5"];
      expect(formatLastMove(moves, "black", undefined)).toBe("2...Qxd5");
    });

    test("formats longer game correctly", () => {
      const moves: AlgebraicNotation[] = [
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
      ];
      expect(formatLastMove(moves, "black", undefined)).toBe("5...a6");
    });
  });

  describe("standard starting FEN", () => {
    test("numbers exactly as an absent FEN does", () => {
      const moves: AlgebraicNotation[] = ["e4", "e5", "Nf3"];
      expect(formatLastMove(moves, "white", STARTING_FEN)).toBe("2. Nf3");
      expect(formatLastMove(moves, "black", STARTING_FEN)).toBe(
        "1...e5 2. Nf3",
      );
    });
  });

  describe("mid-game starting FEN, black to move", () => {
    test("opens on the black half-move the FEN says is next", () => {
      const moves: AlgebraicNotation[] = ["Nc6"];
      expect(formatLastMove(moves, "black", BLACK_TO_MOVE_MIDGAME_FEN)).toBe(
        "2...Nc6",
      );
    });

    test("shows that lone black half-move to White too, rather than reading past the start of the game", () => {
      const moves: AlgebraicNotation[] = ["Nc6"];
      expect(formatLastMove(moves, "white", BLACK_TO_MOVE_MIDGAME_FEN)).toBe(
        "2...Nc6",
      );
    });

    test("offsets every later pair by that half-move", () => {
      const moves: AlgebraicNotation[] = ["Nc6", "Bb5"];
      expect(formatLastMove(moves, "white", BLACK_TO_MOVE_MIDGAME_FEN)).toBe(
        "3. Bb5",
      );
      expect(formatLastMove(moves, "black", BLACK_TO_MOVE_MIDGAME_FEN)).toBe(
        "2...Nc6 3. Bb5",
      );

      const longer: AlgebraicNotation[] = ["Nc6", "Bb5", "a6"];
      expect(formatLastMove(longer, "white", BLACK_TO_MOVE_MIDGAME_FEN)).toBe(
        "3. Bb5 a6",
      );
      expect(formatLastMove(longer, "black", BLACK_TO_MOVE_MIDGAME_FEN)).toBe(
        "3...a6",
      );
    });
  });

  describe("mid-game starting FEN, white to move", () => {
    test("numbers the first half-move from the FEN's fullmove counter", () => {
      const moves: AlgebraicNotation[] = ["Bb5"];
      expect(formatLastMove(moves, "white", WHITE_TO_MOVE_MIDGAME_FEN)).toBe(
        "3. Bb5",
      );
    });

    test("pairs white and black under that number", () => {
      const moves: AlgebraicNotation[] = ["Bb5", "a6"];
      expect(formatLastMove(moves, "white", WHITE_TO_MOVE_MIDGAME_FEN)).toBe(
        "3. Bb5 a6",
      );
      expect(formatLastMove(moves, "black", WHITE_TO_MOVE_MIDGAME_FEN)).toBe(
        "3...a6",
      );
    });

    test("carries the offset into the next pair", () => {
      const moves: AlgebraicNotation[] = ["Bb5", "a6", "Ba4"];
      expect(formatLastMove(moves, "white", WHITE_TO_MOVE_MIDGAME_FEN)).toBe(
        "4. Ba4",
      );
      expect(formatLastMove(moves, "black", WHITE_TO_MOVE_MIDGAME_FEN)).toBe(
        "3...a6 4. Ba4",
      );
    });
  });
});

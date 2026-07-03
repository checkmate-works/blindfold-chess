import { describe, expect, it } from "vitest";

import {
  areDestinationsObscured,
  isBoardObfuscated,
  resolvePieceDisplay,
} from "./piece-display";
import type { BlindfoldDisplaySettings } from "./types";

const normal: BlindfoldDisplaySettings = {
  ownColor: "w",
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: "normal",
  pieceColors: "normal",
  pawnHideMode: "none",
  hiddenPieceStyle: "absent",
};

describe("resolvePieceDisplay", () => {
  it("shows the true piece with normal settings", () => {
    expect(resolvePieceDisplay({ type: "n", color: "b" }, normal)).toEqual({
      kind: "piece",
      type: "n",
      color: "b",
    });
  });

  it("hides own pieces as absent when showOwnPieces is off", () => {
    const settings = { ...normal, showOwnPieces: false };
    expect(resolvePieceDisplay({ type: "q", color: "w" }, settings)).toEqual({
      kind: "absent",
    });
    // Opponent pieces are unaffected.
    expect(resolvePieceDisplay({ type: "q", color: "b" }, settings)).toEqual({
      kind: "piece",
      type: "q",
      color: "b",
    });
  });

  it("renders hidden pieces as ghosts of the TRUE piece on the review toggle", () => {
    const settings: BlindfoldDisplaySettings = {
      ...normal,
      showOpponentPieces: false,
      // Obfuscation must NOT apply to a ghost — it reveals the real piece.
      pieceColors: "white-only",
      hiddenPieceStyle: "ghost",
    };
    expect(resolvePieceDisplay({ type: "r", color: "b" }, settings)).toEqual({
      kind: "ghost",
      type: "r",
      color: "b",
    });
  });

  it("hides pawns per pawnHideMode after the whole-side gate", () => {
    expect(
      resolvePieceDisplay(
        { type: "p", color: "w" },
        { ...normal, pawnHideMode: "own" },
      ),
    ).toEqual({ kind: "absent" });
    expect(
      resolvePieceDisplay(
        { type: "p", color: "b" },
        { ...normal, pawnHideMode: "own" },
      ),
    ).toEqual({ kind: "piece", type: "p", color: "b" });
    expect(
      resolvePieceDisplay(
        { type: "p", color: "b" },
        { ...normal, pawnHideMode: "all" },
      ),
    ).toEqual({ kind: "absent" });
    // Non-pawns are untouched by pawnHideMode.
    expect(
      resolvePieceDisplay(
        { type: "k", color: "w" },
        { ...normal, pawnHideMode: "all" },
      ),
    ).toEqual({ kind: "piece", type: "k", color: "w" });
  });

  it("renders circles per pieceShapeMode, using the recolored color", () => {
    expect(
      resolvePieceDisplay(
        { type: "b", color: "b" },
        { ...normal, pieceShapeMode: "circles-all", pieceColors: "white-only" },
      ),
    ).toEqual({ kind: "circle", color: "w" });
    expect(
      resolvePieceDisplay(
        { type: "b", color: "b" },
        { ...normal, pieceShapeMode: "circles-own" },
      ),
    ).toEqual({ kind: "piece", type: "b", color: "b" });
    expect(
      resolvePieceDisplay(
        { type: "b", color: "b" },
        { ...normal, pieceShapeMode: "circles-opponent" },
      ),
    ).toEqual({ kind: "circle", color: "b" });
  });

  it("forces a single color per pieceColors", () => {
    expect(
      resolvePieceDisplay(
        { type: "q", color: "w" },
        { ...normal, pieceColors: "black-only" },
      ),
    ).toEqual({ kind: "piece", type: "q", color: "b" });
  });

  it("anchors own/opponent to ownColor, not to white", () => {
    const asBlack: BlindfoldDisplaySettings = {
      ...normal,
      ownColor: "b",
      showOwnPieces: false,
    };
    expect(resolvePieceDisplay({ type: "n", color: "b" }, asBlack)).toEqual({
      kind: "absent",
    });
    expect(resolvePieceDisplay({ type: "n", color: "w" }, asBlack)).toEqual({
      kind: "piece",
      type: "n",
      color: "w",
    });
  });
});

describe("isBoardObfuscated / areDestinationsObscured", () => {
  it("both false with normal display", () => {
    expect(isBoardObfuscated(normal)).toBe(false);
    expect(areDestinationsObscured(normal)).toBe(false);
  });

  it("single-color mode obfuscates but keeps destinations visible", () => {
    const s = { ...normal, pieceColors: "white-only" as const };
    expect(isBoardObfuscated(s)).toBe(true);
    expect(areDestinationsObscured(s)).toBe(false);
  });

  it("shape/pawn/side hiding obscures destinations too", () => {
    for (const s of [
      { ...normal, pieceShapeMode: "circles-all" as const },
      { ...normal, pawnHideMode: "all" as const },
      { ...normal, showOwnPieces: false },
      { ...normal, showOpponentPieces: false },
    ]) {
      expect(isBoardObfuscated(s)).toBe(true);
      expect(areDestinationsObscured(s)).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";

import { classifyBoardClick, classifyMoveAttempt } from "./click-policy";

const never = () => {
  throw new Error("findCandidates must not be called here");
};

describe("classifyMoveAttempt", () => {
  it("maps candidate count to illegal-clear / move / promotion", () => {
    expect(classifyMoveAttempt("e2", "e5", [])).toEqual({
      type: "illegal-clear",
      from: "e2",
      to: "e5",
    });
    expect(classifyMoveAttempt("e2", "e4", ["e4"])).toEqual({
      type: "move",
      move: "e4",
    });
    expect(classifyMoveAttempt("e7", "e8", ["e8=Q", "e8=N"])).toEqual({
      type: "promotion",
      from: "e7",
      to: "e8",
      candidates: ["e8=Q", "e8=N"],
    });
  });
});

describe("classifyBoardClick — no selection", () => {
  it("selects a movable piece", () => {
    expect(
      classifyBoardClick({
        square: "e2",
        selectedSquare: null,
        pieceColor: "w",
        movableColor: "w",
        obfuscated: false,
        findCandidates: never,
      }),
    ).toEqual({ type: "select", square: "e2" });
  });

  it("counts a first tap on a non-movable piece only when obfuscated", () => {
    const base = {
      square: "e7",
      selectedSquare: null,
      pieceColor: "b" as const,
      movableColor: "w" as const,
      findCandidates: never,
    };
    expect(classifyBoardClick({ ...base, obfuscated: true })).toEqual({
      type: "illegal",
    });
    expect(classifyBoardClick({ ...base, obfuscated: false })).toEqual({
      type: "noop",
    });
  });

  it("never counts a first tap on an empty square", () => {
    expect(
      classifyBoardClick({
        square: "e4",
        selectedSquare: null,
        pieceColor: null,
        movableColor: "w",
        obfuscated: true,
        findCandidates: never,
      }),
    ).toEqual({ type: "noop" });
  });
});

describe("classifyBoardClick — with selection", () => {
  it("deselects on the selected square without probing candidates", () => {
    expect(
      classifyBoardClick({
        square: "e2",
        selectedSquare: "e2",
        pieceColor: "w",
        movableColor: "w",
        obfuscated: false,
        findCandidates: never,
      }),
    ).toEqual({ type: "deselect" });
  });

  it("emits the single legal candidate", () => {
    expect(
      classifyBoardClick({
        square: "e4",
        selectedSquare: "e2",
        pieceColor: null,
        movableColor: "w",
        obfuscated: true,
        findCandidates: () => ["e4"],
      }),
    ).toEqual({ type: "move", move: "e4" });
  });

  it("defers to the promotion picker on multiple candidates", () => {
    expect(
      classifyBoardClick({
        square: "e8",
        selectedSquare: "e7",
        pieceColor: null,
        movableColor: "w",
        obfuscated: false,
        findCandidates: () => ["e8=Q", "e8=R"],
      }),
    ).toMatchObject({ type: "promotion", from: "e7", to: "e8" });
  });

  it("obfuscated: ANY non-legal target counts and clears — no reselect idiom", () => {
    // Even a click on another own piece counts while obfuscated.
    expect(
      classifyBoardClick({
        square: "d2",
        selectedSquare: "e2",
        pieceColor: "w",
        movableColor: "w",
        obfuscated: true,
        findCandidates: () => [],
      }),
    ).toEqual({ type: "illegal-clear", from: "e2", to: "d2" });
  });

  it("normal: another movable piece reselects silently", () => {
    expect(
      classifyBoardClick({
        square: "d2",
        selectedSquare: "e2",
        pieceColor: "w",
        movableColor: "w",
        obfuscated: false,
        findCandidates: () => [],
      }),
    ).toEqual({ type: "select", square: "d2" });
  });

  it("normal: an illegal empty / opponent destination counts and clears", () => {
    for (const pieceColor of [null, "b" as const]) {
      expect(
        classifyBoardClick({
          square: "e5",
          selectedSquare: "e2",
          pieceColor,
          movableColor: "w",
          obfuscated: false,
          findCandidates: () => [],
        }),
      ).toEqual({ type: "illegal-clear", from: "e2", to: "e5" });
    }
  });
});

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
        findCandidates: never,
      }),
    ).toEqual({ type: "select", square: "e2" });
  });

  it("never counts a first tap on a non-movable (opponent) piece", () => {
    // A first tap on the opponent's piece names no move (there is no source →
    // destination yet) and is indistinguishable from a misclick, so it is a
    // no-op rather than a counted illegal attempt.
    expect(
      classifyBoardClick({
        square: "e7",
        selectedSquare: null,
        pieceColor: "b",
        movableColor: "w",
        findCandidates: never,
      }),
    ).toEqual({ type: "noop" });
  });

  it("never counts a first tap on an empty square", () => {
    expect(
      classifyBoardClick({
        square: "e4",
        selectedSquare: null,
        pieceColor: null,
        movableColor: "w",
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
        findCandidates: () => ["e8=Q", "e8=R"],
      }),
    ).toMatchObject({ type: "promotion", from: "e7", to: "e8" });
  });

  it("reselects another own movable piece silently — a change of intent, never counted", () => {
    // Tapping the d-pawn then tapping one's own knight is a change of which
    // piece to move, not an illegal move onto one's own piece. Holds in every
    // display mode — obfuscation does not turn a reselection into a mistake.
    expect(
      classifyBoardClick({
        square: "d2",
        selectedSquare: "e2",
        pieceColor: "w",
        movableColor: "w",
        findCandidates: () => [],
      }),
    ).toEqual({ type: "select", square: "d2" });
  });

  it("counts an illegal empty / opponent destination and clears", () => {
    for (const pieceColor of [null, "b" as const]) {
      expect(
        classifyBoardClick({
          square: "e5",
          selectedSquare: "e2",
          pieceColor,
          movableColor: "w",
          findCandidates: () => [],
        }),
      ).toEqual({ type: "illegal-clear", from: "e2", to: "e5" });
    }
  });
});

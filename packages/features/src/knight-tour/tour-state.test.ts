import { describe, expect, it } from "vitest";

import {
  DEFAULT_KNIGHT_TOUR_SETTINGS,
  EMPTY_KNIGHT_TOUR_STATE,
  applyKnightMove,
  createKnightTourState,
  knightTourStateFromPath,
  resolveStartingSquare,
  summarizeKnightTour,
  undoKnightMove,
} from "./tour-state";

describe("resolveStartingSquare", () => {
  it("draws a square for the random option", () => {
    expect(resolveStartingSquare("random", () => "c3")).toBe("c3");
  });

  it("keeps a concrete square", () => {
    expect(resolveStartingSquare("e4", () => "c3")).toBe("e4");
  });

  it("defaults to random", () => {
    expect(DEFAULT_KNIGHT_TOUR_SETTINGS.startingSquare).toBe("random");
    expect(DEFAULT_KNIGHT_TOUR_SETTINGS.blindfoldMode).toBe(false);
  });
});

describe("applyKnightMove", () => {
  it("accepts a knight move to an unvisited square", () => {
    const next = applyKnightMove(createKnightTourState("a1"), "b3");
    expect(next.currentSquare).toBe("b3");
    expect(next.visitedSquares.get("b3")).toBe(2);
    expect(next.moveHistory).toEqual(["a1", "b3"]);
  });

  it("returns the same state for a non-knight move", () => {
    const state = createKnightTourState("a1");
    expect(applyKnightMove(state, "a2")).toBe(state);
  });

  it("returns the same state for a visited square", () => {
    const state = applyKnightMove(createKnightTourState("a1"), "b3");
    expect(applyKnightMove(state, "a1")).toBe(state);
  });

  it("rejects every move before the tour starts", () => {
    expect(applyKnightMove(EMPTY_KNIGHT_TOUR_STATE, "b3")).toBe(
      EMPTY_KNIGHT_TOUR_STATE,
    );
  });
});

describe("undoKnightMove", () => {
  it("takes back the last move", () => {
    const state = undoKnightMove(
      applyKnightMove(createKnightTourState("a1"), "b3"),
    );
    expect(state.currentSquare).toBe("a1");
    expect(state.visitedSquares.has("b3")).toBe(false);
    expect(state.moveHistory).toEqual(["a1"]);
  });

  it("cannot undo the starting square", () => {
    const state = createKnightTourState("a1");
    expect(undoKnightMove(state)).toBe(state);
  });
});

describe("knightTourStateFromPath / summarizeKnightTour", () => {
  it("replays a path and drops squares that are not legal moves", () => {
    const state = knightTourStateFromPath(["a1", "b3", "b4", "c5"]);
    expect(state.moveHistory).toEqual(["a1", "b3", "c5"]);
  });

  it("returns the empty state for an empty path", () => {
    expect(knightTourStateFromPath([])).toBe(EMPTY_KNIGHT_TOUR_STATE);
  });

  it("reports an incomplete tour as neither successful nor closed", () => {
    const summary = summarizeKnightTour(knightTourStateFromPath(["a1", "b3"]));
    expect(summary).toMatchObject({
      startingSquare: "a1",
      lastSquare: "b3",
      success: false,
      isClosedTour: false,
    });
    expect(summary.visitedSquares.size).toBe(2);
  });
});

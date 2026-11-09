// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useKnightTour } from "./use-knight-tour";

describe("useKnightTour", () => {
  it("has no moves before start() when no initial square is given", () => {
    const { result } = renderHook(() => useKnightTour());
    expect(result.current.currentSquare).toBe("");
    expect(result.current.availableMoves).toEqual([]);
    expect(result.current.canUndo).toBe(false);
  });

  it("starts on the initial square", () => {
    const { result } = renderHook(() =>
      useKnightTour({ initialStartingSquare: "a1" }),
    );
    expect(result.current.currentSquare).toBe("a1");
    expect([...result.current.availableMoves].sort()).toEqual(["b3", "c2"]);
  });

  it("returns the new state for an accepted move and null for a rejected one", () => {
    const { result } = renderHook(() =>
      useKnightTour({ initialStartingSquare: "a1" }),
    );

    let accepted: ReturnType<typeof result.current.move> = null;
    act(() => {
      accepted = result.current.move("b3");
    });
    expect(accepted).not.toBeNull();
    expect(result.current.currentSquare).toBe("b3");
    expect(result.current.canUndo).toBe(true);

    let rejected: ReturnType<typeof result.current.move> = null;
    act(() => {
      rejected = result.current.move("a1");
    });
    expect(rejected).toBeNull();
    expect(result.current.currentSquare).toBe("b3");
  });

  it("undoes and restarts", () => {
    const { result } = renderHook(() => useKnightTour());
    act(() => result.current.start("g1"));
    act(() => {
      result.current.move("f3");
    });
    act(() => result.current.undo());
    expect(result.current.moveHistory).toEqual(["g1"]);

    act(() => result.current.start("e4"));
    expect(result.current.moveHistory).toEqual(["e4"]);
  });
});

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBoardMoveInput } from "./useBoardMoveInput";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** White to play a7-a8 with a promotion. */
const PROMOTION = "8/P6k/8/8/8/8/8/K7 w - - 0 1";

function setup(
  overrides: Partial<Parameters<typeof useBoardMoveInput>[0]> = {},
) {
  const onMove = vi.fn();
  const onIllegalMove = vi.fn();
  const hook = renderHook((props) => useBoardMoveInput(props), {
    initialProps: {
      fen: START,
      movableColor: "w" as const,
      enabled: true,
      onMove,
      onIllegalMove,
      ...overrides,
    },
  });
  return { ...hook, onMove, onIllegalMove };
}

describe("useBoardMoveInput", () => {
  it("plays a move with two taps: the piece, then its destination", () => {
    const { result, onMove } = setup();
    act(() => result.current.tap("e2"));
    expect(result.current.selectedSquare).toBe("e2");
    expect(result.current.destinationsOf("e2").sort()).toEqual(["e3", "e4"]);
    act(() => result.current.tap("e4"));
    expect(onMove).toHaveBeenCalledWith("e4");
    expect(result.current.selectedSquare).toBeNull();
  });

  it("never counts a first tap on an empty or opponent square", () => {
    const { result, onMove, onIllegalMove } = setup();
    act(() => result.current.tap("e4"));
    act(() => result.current.tap("e7"));
    expect(result.current.selectedSquare).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
    expect(onIllegalMove).not.toHaveBeenCalled();
  });

  it("reselects on another own piece and deselects on the same one", () => {
    const { result, onIllegalMove } = setup();
    act(() => result.current.tap("e2"));
    act(() => result.current.tap("g1"));
    expect(result.current.selectedSquare).toBe("g1");
    act(() => result.current.tap("g1"));
    expect(result.current.selectedSquare).toBeNull();
    expect(onIllegalMove).not.toHaveBeenCalled();
  });

  it("counts a tap on an unreachable square as one illegal attempt", () => {
    const { result, onIllegalMove } = setup();
    act(() => result.current.tap("e2"));
    act(() => result.current.tap("e5"));
    expect(onIllegalMove).toHaveBeenCalledWith("e5", { from: "e2", to: "e5" });
    expect(result.current.selectedSquare).toBeNull();
  });

  it("plays a dropped move and counts a drop on an illegal square", () => {
    const { result, onMove, onIllegalMove } = setup();
    act(() => result.current.drop("g1", "f3"));
    expect(onMove).toHaveBeenCalledWith("Nf3");
    act(() => result.current.drop("g1", "g3"));
    expect(onIllegalMove).toHaveBeenCalledWith("Ng3", {
      from: "g1",
      to: "g3",
    });
  });

  it("cancels a drop off the board or back on its own square", () => {
    const { result, onMove, onIllegalMove } = setup();
    act(() => result.current.drop("e2", null));
    act(() => result.current.drop("e2", "e2"));
    expect(onMove).not.toHaveBeenCalled();
    expect(onIllegalMove).not.toHaveBeenCalled();
  });

  it("lifts only the player's own pieces, and only while enabled", () => {
    const { result, rerender, onMove, onIllegalMove } = setup();
    expect(result.current.canLift("e2")).toBe(true);
    expect(result.current.canLift("e7")).toBe(false);
    expect(result.current.canLift("e4")).toBe(false);
    rerender({
      fen: START,
      movableColor: "w",
      enabled: false,
      onMove,
      onIllegalMove,
    });
    expect(result.current.canLift("e2")).toBe(false);
    act(() => result.current.tap("e2"));
    expect(result.current.selectedSquare).toBeNull();
  });

  it("drops the selection when the position changes", () => {
    const { result, rerender, onMove, onIllegalMove } = setup();
    act(() => result.current.tap("e2"));
    rerender({
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      movableColor: "w",
      enabled: true,
      onMove,
      onIllegalMove,
    });
    expect(result.current.selectedSquare).toBeNull();
  });

  it("holds a promotion until a piece is chosen", () => {
    const { result, onMove } = setup({ fen: PROMOTION });
    act(() => result.current.drop("a7", "a8"));
    expect(onMove).not.toHaveBeenCalled();
    expect(result.current.promotion).toMatchObject({ from: "a7", to: "a8" });
    // The board takes nothing else while the picker is up.
    expect(result.current.canLift("a1")).toBe(false);
    act(() => result.current.choosePromotion("n"));
    expect(onMove).toHaveBeenCalledWith("a8=N");
    expect(result.current.promotion).toBeNull();
  });

  it("drops a cancelled promotion without a move", () => {
    const { result, onMove } = setup({ fen: PROMOTION });
    act(() => result.current.tap("a7"));
    act(() => result.current.tap("a8"));
    expect(result.current.promotion).not.toBeNull();
    act(() => result.current.cancelPromotion());
    expect(result.current.promotion).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("drops a pending promotion for good when the position changes and comes back", () => {
    const { result, rerender, onMove, onIllegalMove } = setup({
      fen: PROMOTION,
    });
    act(() => result.current.tap("a7"));
    act(() => result.current.tap("a8"));
    expect(result.current.promotion).not.toBeNull();

    const props = {
      movableColor: "w" as const,
      enabled: true,
      onMove,
      onIllegalMove,
    };
    rerender({ ...props, fen: START });
    rerender({ ...props, fen: PROMOTION });
    expect(result.current.promotion).toBeNull();
    expect(result.current.selectedSquare).toBeNull();
  });

  it("drops the selection when the board turns off and on in one position", () => {
    const { result, rerender, onMove, onIllegalMove } = setup();
    act(() => result.current.tap("e2"));
    expect(result.current.selectedSquare).toBe("e2");

    const props = {
      fen: START,
      movableColor: "w" as const,
      onMove,
      onIllegalMove,
    };
    rerender({ ...props, enabled: false });
    rerender({ ...props, enabled: true });
    expect(result.current.selectedSquare).toBeNull();
  });
});

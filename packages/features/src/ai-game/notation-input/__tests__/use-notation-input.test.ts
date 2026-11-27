// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotationInput } from "../use-notation-input";

describe("useNotationInput", () => {
  const STARTING_FEN =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const AFTER_E4_FEN =
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockClear();
  });

  function renderAt(fen = STARTING_FEN) {
    return renderHook(() => useNotationInput({ fen, onSubmit }));
  }

  describe("initial state", () => {
    it("starts empty and not submittable", () => {
      const { result } = renderAt();

      expect(result.current.state.input).toBe("");
      expect(result.current.isSubmittable).toBe(false);
    });
  });

  describe("typing", () => {
    it("appendChar builds the input and makes it submittable", () => {
      const { result } = renderAt();

      act(() => {
        result.current.appendChar("e");
      });
      act(() => {
        result.current.appendChar("4");
      });

      expect(result.current.state.input).toBe("e4");
      expect(result.current.isSubmittable).toBe(true);
    });

    it("appendCastling adds the whole token", () => {
      const { result } = renderAt();

      act(() => {
        result.current.appendCastling("O-O-O");
      });

      expect(result.current.state.input).toBe("O-O-O");
    });

    it("backspace removes the last character", () => {
      const { result } = renderAt();

      act(() => {
        result.current.appendChar("e");
      });
      act(() => {
        result.current.appendChar("4");
      });
      act(() => {
        result.current.backspace();
      });

      expect(result.current.state.input).toBe("e");
    });

    it("clear resets input to empty", () => {
      const { result } = renderAt();

      act(() => {
        result.current.appendChar("N");
      });
      act(() => {
        result.current.appendChar("f");
      });
      act(() => {
        result.current.clear();
      });

      expect(result.current.state.input).toBe("");
      expect(result.current.isSubmittable).toBe(false);
    });
  });

  describe("FEN-change reset", () => {
    it("clears the input when FEN changes between renders (move accepted)", () => {
      const { result, rerender } = renderHook(
        ({ fen }: { fen: string }) => useNotationInput({ fen, onSubmit }),
        { initialProps: { fen: STARTING_FEN } },
      );

      act(() => {
        result.current.appendChar("e");
      });
      act(() => {
        result.current.appendChar("4");
      });
      expect(result.current.state.input).toBe("e4");

      rerender({ fen: AFTER_E4_FEN });

      expect(result.current.state.input).toBe("");
      expect(result.current.isSubmittable).toBe(false);
    });

    it("keeps the input when FEN stays the same across rerenders", () => {
      const { result, rerender } = renderHook(
        ({ fen }: { fen: string }) => useNotationInput({ fen, onSubmit }),
        { initialProps: { fen: STARTING_FEN } },
      );

      act(() => {
        result.current.appendChar("e");
      });
      rerender({ fen: STARTING_FEN });

      expect(result.current.state.input).toBe("e");
    });
  });

  describe("submit", () => {
    it("is a no-op when input is empty", () => {
      const { result } = renderAt();

      act(() => {
        result.current.submit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("calls onSubmit with the current input", () => {
      const { result } = renderAt();

      act(() => {
        result.current.appendChar("e");
      });
      act(() => {
        result.current.appendChar("4");
      });
      act(() => {
        result.current.submit();
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith("e4");
    });

    it("keeps the input after submit, so a rejected move can be corrected", () => {
      const { result } = renderAt();

      act(() => {
        result.current.appendChar("e");
      });
      act(() => {
        result.current.appendChar("5");
      });
      act(() => {
        result.current.submit();
      });

      expect(result.current.state.input).toBe("e5");
    });
  });

  describe("action identity stability", () => {
    it("action callbacks are stable across rerenders", () => {
      const { result, rerender } = renderHook(
        ({ fen }: { fen: string }) => useNotationInput({ fen, onSubmit }),
        { initialProps: { fen: STARTING_FEN } },
      );

      const first = {
        appendChar: result.current.appendChar,
        appendCastling: result.current.appendCastling,
        backspace: result.current.backspace,
        clear: result.current.clear,
      };

      rerender({ fen: STARTING_FEN });

      expect(result.current.appendChar).toBe(first.appendChar);
      expect(result.current.appendCastling).toBe(first.appendCastling);
      expect(result.current.backspace).toBe(first.backspace);
      expect(result.current.clear).toBe(first.clear);
    });
  });
});

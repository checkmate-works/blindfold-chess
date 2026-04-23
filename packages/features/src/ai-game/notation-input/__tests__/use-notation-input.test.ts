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

  describe("initial state", () => {
    it("exposes an empty state and non-submittable preview", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

      expect(result.current.state.input).toBe("");
      expect(result.current.previewText).toBe("");
      expect(result.current.isSubmittable).toBe(false);
      expect(result.current.showPromotion).toBe(false);
      expect(result.current.isPawnCaptureMode).toBe(false);
    });
  });

  describe("text-builder surface (web keypad)", () => {
    it("appendChar drives both state.input and previewText", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

      act(() => {
        result.current.appendChar("e");
      });
      act(() => {
        result.current.appendChar("4");
      });

      expect(result.current.state.input).toBe("e4");
      expect(result.current.isSubmittable).toBe(true);
    });

    it("backspace removes the last character", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

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
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

      act(() => {
        result.current.appendChar("N");
      });
      act(() => {
        result.current.appendChar("f");
      });
      act(() => {
        result.current.appendChar("3");
      });
      act(() => {
        result.current.clear();
      });

      expect(result.current.state.input).toBe("");
      expect(result.current.isSubmittable).toBe(false);
    });
  });

  describe("structured surface (mobile button UI)", () => {
    it("selectPiece + selectFile + selectRank build previewText", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

      act(() => {
        result.current.selectPiece("N");
      });
      act(() => {
        result.current.selectFile("f");
      });
      act(() => {
        result.current.selectRank("3");
      });

      expect(result.current.state.input).toBe("Nf3");
      expect(result.current.previewText).toBe("Nf3");
    });

    it("exits pawn capture mode clears targetFile via the hook surface", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

      act(() => {
        result.current.selectFile("e");
      });
      act(() => {
        result.current.toggleCapture();
      });
      act(() => {
        result.current.setTargetFile("d");
      });

      expect(result.current.state.targetFile).toBe("d");
      expect(result.current.isPawnCaptureMode).toBe(true);

      act(() => {
        result.current.toggleCapture();
      });

      expect(result.current.state.targetFile).toBeNull();
      expect(result.current.isPawnCaptureMode).toBe(false);
    });

    it("showPromotion reflects pawn pushes to rank 8", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

      act(() => {
        result.current.selectFile("e");
      });
      act(() => {
        result.current.selectRank("8");
      });

      expect(result.current.showPromotion).toBe(true);

      act(() => {
        result.current.selectPromotion("q");
      });

      expect(result.current.state.input).toBe("e8=Q");
    });
  });

  describe("FEN-change reset", () => {
    it("clears state when FEN changes between renders (move accepted)", () => {
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

    it("does not reset state when FEN stays the same across rerenders", () => {
      const { result, rerender } = renderHook(
        ({ fen }: { fen: string }) => useNotationInput({ fen, onSubmit }),
        { initialProps: { fen: STARTING_FEN } },
      );

      act(() => {
        result.current.appendChar("e");
      });
      expect(result.current.state.input).toBe("e");

      rerender({ fen: STARTING_FEN });

      expect(result.current.state.input).toBe("e");
    });

    it("also resets structured state on FEN change (not just input string)", () => {
      const { result, rerender } = renderHook(
        ({ fen }: { fen: string }) => useNotationInput({ fen, onSubmit }),
        { initialProps: { fen: STARTING_FEN } },
      );

      act(() => {
        result.current.selectPiece("N");
      });
      act(() => {
        result.current.selectFile("f");
      });
      expect(result.current.state.selectedPiece).toBe("N");
      expect(result.current.state.selectedFiles.has("f")).toBe(true);

      rerender({ fen: AFTER_E4_FEN });

      expect(result.current.state.selectedPiece).toBeNull();
      expect(result.current.state.selectedFiles.size).toBe(0);
    });
  });

  describe("submit", () => {
    it("is a no-op when input is empty", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

      act(() => {
        result.current.submit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("calls onSubmit with the current input as AlgebraicNotation", () => {
      const { result } = renderHook(() =>
        useNotationInput({ fen: STARTING_FEN, onSubmit }),
      );

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

    it("does NOT reset state after submit when resetOnSubmit is false (web keypad)", () => {
      const { result } = renderHook(() =>
        useNotationInput({
          fen: STARTING_FEN,
          onSubmit,
          resetOnSubmit: false,
        }),
      );

      act(() => {
        result.current.appendChar("e");
      });
      act(() => {
        result.current.appendChar("4");
      });
      act(() => {
        result.current.submit();
      });

      // State is preserved — the web keypad relies on this so that a rejected
      // SAN stays in the preview for the user to correct.
      expect(result.current.state.input).toBe("e4");
      expect(onSubmit).toHaveBeenCalledWith("e4");
    });

    it("resets state after submit when resetOnSubmit is true (mobile buttons)", () => {
      const { result } = renderHook(() =>
        useNotationInput({
          fen: STARTING_FEN,
          onSubmit,
          resetOnSubmit: true,
        }),
      );

      act(() => {
        result.current.selectPiece("N");
      });
      act(() => {
        result.current.selectFile("f");
      });
      act(() => {
        result.current.selectRank("3");
      });
      expect(result.current.state.input).toBe("Nf3");

      act(() => {
        result.current.submit();
      });

      expect(onSubmit).toHaveBeenCalledWith("Nf3");
      expect(result.current.state.input).toBe("");
      expect(result.current.state.selectedPiece).toBeNull();
      expect(result.current.state.selectedFiles.size).toBe(0);
      expect(result.current.state.selectedRanks.size).toBe(0);
    });
  });

  describe("reset", () => {
    it("clears state regardless of resetOnSubmit setting", () => {
      const { result } = renderHook(() =>
        useNotationInput({
          fen: STARTING_FEN,
          onSubmit,
          resetOnSubmit: false,
        }),
      );

      act(() => {
        result.current.selectPiece("Q");
      });
      act(() => {
        result.current.selectFile("d");
      });
      act(() => {
        result.current.selectRank("5");
      });
      expect(result.current.state.input).toBe("Qd5");

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.input).toBe("");
      expect(result.current.state.selectedPiece).toBeNull();
    });
  });

  describe("action identity stability", () => {
    it("action callbacks are stable across rerenders (useCallback wiring)", () => {
      const { result, rerender } = renderHook(
        ({ fen }: { fen: string }) => useNotationInput({ fen, onSubmit }),
        { initialProps: { fen: STARTING_FEN } },
      );

      const first = {
        appendChar: result.current.appendChar,
        backspace: result.current.backspace,
        clear: result.current.clear,
        selectPiece: result.current.selectPiece,
      };

      rerender({ fen: STARTING_FEN });

      expect(result.current.appendChar).toBe(first.appendChar);
      expect(result.current.backspace).toBe(first.backspace);
      expect(result.current.clear).toBe(first.clear);
      expect(result.current.selectPiece).toBe(first.selectPiece);
    });
  });
});

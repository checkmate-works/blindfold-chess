"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AlgebraicNotation } from "@blindfold-chess/types";

import {
  computeIsPawnCaptureMode,
  computeIsSubmittable,
  computePreviewText,
  computeShowPromotion,
  createInitialState,
  notationInputReducer,
} from "./state-machine";
import type {
  CastlingToken,
  NotationChar,
  NotationInputAction,
  NotationInputState,
  PromotionPiece,
  UseNotationInputOptions,
  UseNotationInputReturn,
} from "./types";

export function useNotationInput({
  fen,
  onSubmit,
  resetOnSubmit = false,
}: UseNotationInputOptions): UseNotationInputReturn {
  const [state, setState] = useState<NotationInputState>(createInitialState);
  const prevFenRef = useRef(fen);

  // Reset when FEN changes (a move was accepted by the game).
  useEffect(() => {
    if (prevFenRef.current !== fen) {
      prevFenRef.current = fen;
      setState(createInitialState());
    }
  }, [fen]);

  const dispatch = useCallback((...actions: NotationInputAction[]) => {
    setState((prev) =>
      actions.reduce((s, action) => notationInputReducer(s, action), prev),
    );
  }, []);

  const appendChar = useCallback(
    (char: NotationChar) => dispatch({ type: "appendChar", char }),
    [dispatch],
  );
  const appendCastling = useCallback(
    (move: CastlingToken) => dispatch({ type: "appendCastling", move }),
    [dispatch],
  );
  const backspace = useCallback(
    () => dispatch({ type: "backspace" }),
    [dispatch],
  );
  const clear = useCallback(() => dispatch({ type: "clear" }), [dispatch]);

  const selectPiece = useCallback(
    (piece: string) => dispatch({ type: "selectPiece", piece }),
    [dispatch],
  );
  const selectFile = useCallback(
    (file: string) => dispatch({ type: "selectFile", file }),
    [dispatch],
  );
  const selectRank = useCallback(
    (rank: string) => dispatch({ type: "selectRank", rank }),
    [dispatch],
  );
  const setTargetFile = useCallback(
    (file: string | null) => dispatch({ type: "setTargetFile", file }),
    [dispatch],
  );
  const toggleCapture = useCallback(
    () => dispatch({ type: "toggleCapture" }),
    [dispatch],
  );
  const toggleCheck = useCallback(
    () => dispatch({ type: "toggleCheck" }),
    [dispatch],
  );
  const selectCastling = useCallback(
    (move: CastlingToken) => dispatch({ type: "selectCastling", move }),
    [dispatch],
  );
  const selectPromotion = useCallback(
    (piece: PromotionPiece) => dispatch({ type: "selectPromotion", piece }),
    [dispatch],
  );
  const selectSourceFile = useCallback(
    (file: string) => dispatch({ type: "selectSourceFile", file }),
    [dispatch],
  );
  const selectSourceRank = useCallback(
    (rank: string) => dispatch({ type: "selectSourceRank", rank }),
    [dispatch],
  );
  const toggleAmbiguous = useCallback(
    () => dispatch({ type: "toggleAmbiguous" }),
    [dispatch],
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  const previewText = useMemo(() => computePreviewText(state), [state]);
  const showPromotion = useMemo(() => computeShowPromotion(state), [state]);
  const isPawnCaptureMode = useMemo(
    () => computeIsPawnCaptureMode(state),
    [state],
  );
  const isSubmittable = useMemo(() => computeIsSubmittable(state), [state]);

  const submit = useCallback(() => {
    if (state.input.length === 0) return;
    onSubmit(state.input as AlgebraicNotation);
    if (resetOnSubmit) {
      dispatch({ type: "reset" });
    }
    // When resetOnSubmit is false:
    // - On success: the parent's FEN changes, the effect above clears state.
    // - On failure: keep state so the user can backspace to correct.
  }, [state.input, onSubmit, resetOnSubmit, dispatch]);

  return {
    state,
    previewText,
    showPromotion,
    isPawnCaptureMode,
    isSubmittable,
    appendChar,
    appendCastling,
    backspace,
    clear,
    selectPiece,
    selectFile,
    selectRank,
    setTargetFile,
    toggleCapture,
    toggleCheck,
    selectCastling,
    selectPromotion,
    selectSourceFile,
    selectSourceRank,
    toggleAmbiguous,
    reset,
    submit,
  };
}

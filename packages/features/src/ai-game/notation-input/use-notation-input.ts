"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AlgebraicNotation } from "@blindfold-chess/types";

import {
  computeIsSubmittable,
  createInitialState,
  notationInputReducer,
} from "./state-machine";
import type {
  CastlingToken,
  NotationChar,
  NotationInputAction,
  NotationInputState,
  UseNotationInputOptions,
  UseNotationInputReturn,
} from "./types";

/**
 * SAN keypad state, wrapping {@link notationInputReducer}. The input resets
 * whenever `fen` changes — i.e. when the game accepts a move — so a
 * rejected move stays on screen for correction while an accepted one
 * clears.
 */
export function useNotationInput({
  fen,
  onSubmit,
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

  const dispatch = useCallback((action: NotationInputAction) => {
    setState((prev) => notationInputReducer(prev, action));
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

  const isSubmittable = useMemo(() => computeIsSubmittable(state), [state]);

  const submit = useCallback(() => {
    if (state.input.length === 0) return;
    onSubmit(state.input as AlgebraicNotation);
  }, [state.input, onSubmit]);

  return {
    state,
    isSubmittable,
    appendChar,
    appendCastling,
    backspace,
    clear,
    submit,
  };
}

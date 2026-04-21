import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type CastlingToken,
  type NotationChar,
  type NotationInputState,
  computeIsSubmittable,
  createInitialState,
  notationInputReducer,
} from '@blindfold-chess/features/ai-game/notation-input';
import type { AlgebraicNotation } from '@blindfold-chess/types';

type ButtonInputLogicProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

export function useButtonInputLogic({ fen, onSubmit }: ButtonInputLogicProps) {
  const [state, setState] = useState<NotationInputState>(createInitialState);
  const prevFenRef = useRef(fen);

  // Reset input when FEN changes (i.e. a move was accepted by the game).
  useEffect(() => {
    if (prevFenRef.current !== fen) {
      prevFenRef.current = fen;
      setState(createInitialState());
    }
  }, [fen]);

  const appendChar = useCallback((char: NotationChar) => {
    setState((prev) => notationInputReducer(prev, { type: 'appendChar', char }));
  }, []);

  const appendCastling = useCallback((move: CastlingToken) => {
    setState((prev) => notationInputReducer(prev, { type: 'appendCastling', move }));
  }, []);

  const backspace = useCallback(() => {
    setState((prev) => notationInputReducer(prev, { type: 'backspace' }));
  }, []);

  const clear = useCallback(() => {
    setState((prev) => notationInputReducer(prev, { type: 'clear' }));
  }, []);

  const submit = useCallback(() => {
    if (!computeIsSubmittable(state)) return;
    onSubmit(state.input as AlgebraicNotation);
    // Intentionally do NOT reset state here.
    // - On success: the parent's FEN changes, and the useEffect above clears.
    // - On failure: keep input so the user can backspace to correct.
  }, [state, onSubmit]);

  return {
    input: state.input,
    canSubmit: computeIsSubmittable(state),
    appendChar,
    appendCastling,
    backspace,
    clear,
    submit,
  };
}

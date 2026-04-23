import { useNotationInput } from '@blindfold-chess/features/ai-game/notation-input';
import type { AlgebraicNotation } from '@blindfold-chess/types';

type ButtonInputLogicProps = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

/**
 * Web adapter over the shared `useNotationInput` hook.
 *
 * Exposes the text-builder surface the algebraic-notation keypad UI needs:
 * the current input string, its submittability, and per-character / castling
 * append, backspace, clear, submit actions.
 */
export function useButtonInputLogic({ fen, onSubmit }: ButtonInputLogicProps) {
  const n = useNotationInput({ fen, onSubmit, resetOnSubmit: false });

  return {
    input: n.state.input,
    canSubmit: n.isSubmittable,
    appendChar: n.appendChar,
    appendCastling: n.appendCastling,
    backspace: n.backspace,
    clear: n.clear,
    submit: n.submit,
  };
}

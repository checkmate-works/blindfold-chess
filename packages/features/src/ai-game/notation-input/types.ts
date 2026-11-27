import type { AlgebraicNotation } from "@blindfold-chess/types";

/**
 * Cap on `input`, in characters. Keystrokes (and a castling token) that
 * would exceed it are dropped.
 */
export const MAX_NOTATION_INPUT_LENGTH = 10;

export type NotationChar =
  | "K"
  | "Q"
  | "R"
  | "B"
  | "N"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "x"
  | "+"
  | "="
  | "#";

export type CastlingToken = "O-O" | "O-O-O";

/**
 * The SAN keypad's state on both apps: the characters typed so far, which
 * is the SAN that `submit` sends.
 */
export type NotationInputState = {
  input: string;
};

export type NotationInputAction =
  | { type: "appendChar"; char: NotationChar }
  | { type: "appendCastling"; move: CastlingToken }
  | { type: "backspace" }
  | { type: "clear" };

export type UseNotationInputOptions = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
};

export type UseNotationInputReturn = {
  state: NotationInputState;
  isSubmittable: boolean;
  appendChar: (char: NotationChar) => void;
  appendCastling: (move: CastlingToken) => void;
  backspace: () => void;
  clear: () => void;
  /**
   * Calls `onSubmit` with `state.input` (unvalidated); no-op when it is
   * empty. The input is kept: a rejected move stays on screen to be
   * corrected, and an accepted one changes `fen`, which clears it.
   */
  submit: () => void;
};

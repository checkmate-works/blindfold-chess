import type { AlgebraicNotation } from "@blindfold-chess/types";

/**
 * Cap on the text-builder `input`, in characters. Keystrokes (and a castling
 * token) that would exceed it are dropped. Structured actions are not capped.
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

import type { PromotionPiece } from "@blindfold-chess/types";

export type { PromotionPiece };

/**
 * State shared by two independent input surfaces. The web keypad's
 * text-builder actions edit `input` directly and never touch the other
 * fields; the mobile structured actions edit the other fields and rewrite
 * `input` from them (see `computePreviewText`). Either way `input` is the
 * SAN that `submit` sends.
 */
export type NotationInputState = {
  input: string;
  selectedPiece: string | null;
  /**
   * At most one element (selections toggle). With a piece selected it is the
   * destination file; for a pawn it is the pawn's own file.
   */
  selectedFiles: Set<string>;
  /** At most one element: the destination rank. */
  selectedRanks: Set<string>;
  /** Destination file of a pawn capture; cleared outside pawn-capture mode. */
  targetFile: string | null;
  isCapture: boolean;
  isCheck: boolean;
  castling: CastlingToken | null;
  promotionPiece: PromotionPiece | null;
  sourceFile: string | null;
  sourceRank: string | null;
  isAmbiguous: boolean;
};

export type NotationInputAction =
  // Text-builder actions (web keypad)
  | { type: "appendChar"; char: NotationChar }
  | { type: "appendCastling"; move: CastlingToken }
  | { type: "backspace" }
  | { type: "clear" }
  // Structured actions (mobile button UI)
  | { type: "selectPiece"; piece: string }
  | { type: "selectFile"; file: string }
  | { type: "selectRank"; rank: string }
  | { type: "setTargetFile"; file: string | null }
  | { type: "toggleCapture" }
  | { type: "toggleCheck" }
  | { type: "selectCastling"; move: CastlingToken }
  | { type: "selectPromotion"; piece: PromotionPiece }
  | { type: "selectSourceFile"; file: string }
  | { type: "selectSourceRank"; rank: string }
  | { type: "toggleAmbiguous" }
  | { type: "reset" };

export type UseNotationInputOptions = {
  fen: string;
  onSubmit: (move: AlgebraicNotation) => void;
  /**
   * When true, `submit` resets all state after calling `onSubmit`. The web
   * keypad sets this to false so that a rejected SAN remains in the preview
   * and the user can backspace to correct; the mobile structured UI sets it
   * to true because each submit starts a fresh selection.
   */
  resetOnSubmit?: boolean;
};

export type UseNotationInputReturn = {
  // Full state — consumers pick the fields their UI renders.
  state: NotationInputState;
  // Preview / submittability (cheap, memoised).
  /** Built from the structured fields only — empty while using the text-builder surface. */
  previewText: string;
  showPromotion: boolean;
  isPawnCaptureMode: boolean;
  isSubmittable: boolean;
  // Text-builder surface (web keypad).
  appendChar: (char: NotationChar) => void;
  appendCastling: (move: CastlingToken) => void;
  backspace: () => void;
  clear: () => void;
  // Structured surface (mobile button UI).
  selectPiece: (piece: string) => void;
  selectFile: (file: string) => void;
  selectRank: (rank: string) => void;
  setTargetFile: (file: string | null) => void;
  toggleCapture: () => void;
  toggleCheck: () => void;
  selectCastling: (move: CastlingToken) => void;
  selectPromotion: (piece: PromotionPiece) => void;
  selectSourceFile: (file: string) => void;
  selectSourceRank: (rank: string) => void;
  toggleAmbiguous: () => void;
  reset: () => void;
  // High-level submit.
  /** Calls `onSubmit` with `state.input` (unvalidated); no-op when it is empty. */
  submit: () => void;
};

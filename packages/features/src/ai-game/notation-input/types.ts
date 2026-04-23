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

export type PromotionPiece = "q" | "r" | "b" | "n";

export type NotationInputState = {
  input: string;
  selectedPiece: string | null;
  selectedFiles: Set<string>;
  selectedRanks: Set<string>;
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

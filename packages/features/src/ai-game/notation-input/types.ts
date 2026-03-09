import type { CastlingMove } from "@blindfold-chess/types";
export type { CastlingMove } from "@blindfold-chess/types";

export type PromotionPiece = "q" | "r" | "b" | "n";

export type NotationInputState = {
  selectedPiece: string | null;
  selectedFiles: Set<string>;
  selectedRanks: Set<string>;
  targetFile: string | null;
  isCapture: boolean;
  isCheck: boolean;
  castling: CastlingMove | null;
  promotionPiece: PromotionPiece | null;
  sourceFile: string | null;
  sourceRank: string | null;
  isAmbiguous: boolean;
};

export type NotationInputAction =
  | { type: "selectPiece"; piece: string }
  | { type: "selectFile"; file: string }
  | { type: "selectRank"; rank: string }
  | { type: "toggleCapture" }
  | { type: "toggleCheck" }
  | { type: "selectCastling"; move: CastlingMove }
  | { type: "selectPromotion"; piece: PromotionPiece }
  | { type: "selectSourceFile"; file: string }
  | { type: "selectSourceRank"; rank: string }
  | { type: "toggleAmbiguous" }
  | { type: "setTargetFile"; file: string | null }
  | { type: "reset" };

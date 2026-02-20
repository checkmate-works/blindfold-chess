import type { PieceType as AllPieceType } from "@blindfold-chess/types";

import type {
  BasePracticeResult,
  BasePracticeSettings,
  PracticeMode,
} from "../common/types";

export type { PracticeMode };

export type PieceType = Extract<AllPieceType, "b" | "n" | "r" | "q" | "k">;
export const PIECE_TYPES: readonly PieceType[] = [
  "b",
  "n",
  "r",
  "q",
  "k",
] as const;

export type MoveQuestion = {
  from: string;
  to: string;
  piece: PieceType;
};

export type LegalMovesSettings = BasePracticeSettings & {
  selectedPieces: PieceType[];
};

export const DEFAULT_LEGAL_MOVES_SETTINGS: LegalMovesSettings = {
  timeLimit: 60,
  selectedPieces: [...PIECE_TYPES],
  mode: "timed",
};

export type LegalMovesResult = BasePracticeResult & {
  incorrectAnswers: number;
};

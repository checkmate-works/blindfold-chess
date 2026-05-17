import type { PieceType as AllPieceType } from "@blindfold-chess/types";

import {
  type BasePracticeSettings,
  type PracticeResultWithMistakes,
  DEFAULT_BASE_PRACTICE_SETTINGS,
} from "../common/types";

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
  ...DEFAULT_BASE_PRACTICE_SETTINGS,
  selectedPieces: [...PIECE_TYPES],
};

export type LegalMovesResult = PracticeResultWithMistakes;

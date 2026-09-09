import type { Square } from "@blindfold-chess/types";

import type { DisplayPieceType } from "../common/piece-glyphs";
import {
  type BasePracticeSettings,
  type PracticeResultWithMistakes,
  DEFAULT_BASE_PRACTICE_SETTINGS,
} from "../common/types";

/**
 * The pieces a legal-moves drill can ask about: every piece but the pawn,
 * which is also exactly the set that has a display glyph.
 */
export type PieceType = DisplayPieceType;
export const PIECE_TYPES: readonly PieceType[] = [
  "b",
  "n",
  "r",
  "q",
  "k",
] as const;

export type MoveQuestion = {
  from: Square;
  to: Square;
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

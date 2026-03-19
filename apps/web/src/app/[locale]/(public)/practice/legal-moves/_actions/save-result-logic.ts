import type { LegalMovesResult, LegalMovesSettings } from '@/lib/db/practice-session-types';

export type SaveLegalMovesResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  timeLimit: number;
  selectedPiece: string;
  mistakeAllowance: number;
};

export function buildLegalMovesData(input: SaveLegalMovesResultInput): {
  menuType: 'legal_moves';
  settings: LegalMovesSettings;
  result: LegalMovesResult;
} {
  const settings: LegalMovesSettings = {
    timeLimit: input.timeLimit,
    selectedPiece: input.selectedPiece,
    mistakeAllowance: input.mistakeAllowance,
  };

  const result: LegalMovesResult = {
    correctAnswers: input.correctAnswers,
    incorrectAnswers: input.incorrectAnswers,
    timeTaken: input.timeTaken,
  };

  return { menuType: 'legal_moves', settings, result };
}

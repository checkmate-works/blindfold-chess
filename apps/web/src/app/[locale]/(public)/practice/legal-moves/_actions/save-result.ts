'use server';

import type { LegalMovesResult, LegalMovesSettings } from '@/lib/db/practice-session-types';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

type SaveLegalMovesResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  timeLimit: number;
  selectedPieces: string[];
  mistakeAllowance: number;
};

export function buildLegalMovesData(input: SaveLegalMovesResultInput): {
  menuType: 'legal_moves';
  settings: LegalMovesSettings;
  result: LegalMovesResult;
} {
  const settings: LegalMovesSettings = {
    timeLimit: input.timeLimit,
    selectedPieces: input.selectedPieces,
    mistakeAllowance: input.mistakeAllowance,
  };

  const result: LegalMovesResult = {
    correctAnswers: input.correctAnswers,
    incorrectAnswers: input.incorrectAnswers,
    timeTaken: input.timeTaken,
  };

  return { menuType: 'legal_moves', settings, result };
}

export async function saveLegalMovesResult(input: SaveLegalMovesResultInput) {
  const { menuType, settings, result } = buildLegalMovesData(input);
  return savePracticeResult(menuType, settings, result);
}

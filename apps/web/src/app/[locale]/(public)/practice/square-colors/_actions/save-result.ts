'use server';

import type { SquareColorsResult, SquareColorsSettings } from '@/lib/db/practice-session-types';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

type SaveSquareColorsResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  mistakeAllowance: number;
};

export function buildSquareColorsData(input: SaveSquareColorsResultInput): {
  menuType: 'square_colors';
  settings: SquareColorsSettings;
  result: SquareColorsResult;
} {
  const settings: SquareColorsSettings = {
    timeLimit: 60,
    mistakeAllowance: input.mistakeAllowance,
  };

  const result: SquareColorsResult = {
    correctAnswers: input.correctAnswers,
    incorrectAnswers: input.incorrectAnswers,
    timeTaken: input.timeTaken,
  };

  return { menuType: 'square_colors', settings, result };
}

export async function saveSquareColorsResult(input: SaveSquareColorsResultInput) {
  const { menuType, settings, result } = buildSquareColorsData(input);
  return savePracticeResult(menuType, settings, result);
}

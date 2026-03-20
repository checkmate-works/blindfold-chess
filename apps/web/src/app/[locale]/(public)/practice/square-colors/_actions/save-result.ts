'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveSquareColorsResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

export async function saveSquareColorsResult(input: SaveSquareColorsResultInput) {
  return savePracticeResult(
    'square_colors',
    {},
    {
      score: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    }
  );
}

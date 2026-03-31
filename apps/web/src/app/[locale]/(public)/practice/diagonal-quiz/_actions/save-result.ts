'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveDiagonalQuizResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

export async function saveDiagonalQuizResult(input: SaveDiagonalQuizResultInput) {
  return savePracticeResult(
    'diagonal_quiz',
    {},
    {
      score: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    }
  );
}

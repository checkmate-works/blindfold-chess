'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveCoordinateQuizResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  boardOrientation: string;
};

export async function saveCoordinateQuizResult(input: SaveCoordinateQuizResultInput) {
  return savePracticeResult(
    'coordinate_quiz',
    { boardOrientation: input.boardOrientation },
    {
      score: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    }
  );
}

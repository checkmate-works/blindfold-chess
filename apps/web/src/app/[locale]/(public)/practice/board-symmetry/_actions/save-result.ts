'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveBoardSymmetryResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

export async function saveBoardSymmetryResult(input: SaveBoardSymmetryResultInput) {
  return savePracticeResult(
    'board_symmetry',
    {},
    {
      score: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    }
  );
}

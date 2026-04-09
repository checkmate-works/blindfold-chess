'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveDiagonalQuizResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

const saveAction = createSaveResultAction<SaveDiagonalQuizResultInput>('diagonal_quiz');

export async function saveDiagonalQuizResult(input: SaveDiagonalQuizResultInput) {
  return saveAction(input);
}

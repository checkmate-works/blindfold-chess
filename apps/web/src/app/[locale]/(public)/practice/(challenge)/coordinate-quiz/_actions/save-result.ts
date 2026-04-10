'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';

export type SaveCoordinateQuizResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  boardOrientation: string;
};

const saveAction = createSaveResultAction<SaveCoordinateQuizResultInput>(
  'coordinate_quiz',
  (input) => ({
    boardOrientation: input.boardOrientation,
  })
);

export async function saveCoordinateQuizResult(input: SaveCoordinateQuizResultInput) {
  return saveAction(input);
}

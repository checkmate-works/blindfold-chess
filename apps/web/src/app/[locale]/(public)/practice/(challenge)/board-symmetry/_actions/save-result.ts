'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';

export type SaveBoardSymmetryResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

const saveAction = createSaveResultAction<SaveBoardSymmetryResultInput>('board_symmetry');

export async function saveBoardSymmetryResult(input: SaveBoardSymmetryResultInput) {
  return saveAction(input);
}

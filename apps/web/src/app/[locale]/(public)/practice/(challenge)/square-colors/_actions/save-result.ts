'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';

export type SaveSquareColorsResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

const saveAction = createSaveResultAction<SaveSquareColorsResultInput>('square_colors');

export async function saveSquareColorsResult(input: SaveSquareColorsResultInput) {
  return saveAction(input);
}

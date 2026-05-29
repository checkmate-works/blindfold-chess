'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';
import type { StandardChallengeInput } from '../../_lib/create-save-result-action';

export type SaveSquareColorsResultInput = StandardChallengeInput;

const saveAction = createSaveResultAction<SaveSquareColorsResultInput>('square_colors');

export async function saveSquareColorsResult(input: SaveSquareColorsResultInput) {
  return saveAction(input);
}

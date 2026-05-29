'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';
import type { StandardChallengeInput } from '../../_lib/create-save-result-action';

export type SaveDiagonalQuizResultInput = StandardChallengeInput;

const saveAction = createSaveResultAction<SaveDiagonalQuizResultInput>('diagonal_quiz');

export async function saveDiagonalQuizResult(input: SaveDiagonalQuizResultInput) {
  return saveAction(input);
}

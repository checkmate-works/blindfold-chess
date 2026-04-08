'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveLegalMovesResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  selectedPiece: string;
};

const saveAction = createSaveResultAction<SaveLegalMovesResultInput>('legal_moves', (input) => ({
  selectedPiece: input.selectedPiece,
}));

export async function saveLegalMovesResult(input: SaveLegalMovesResultInput) {
  return saveAction(input);
}

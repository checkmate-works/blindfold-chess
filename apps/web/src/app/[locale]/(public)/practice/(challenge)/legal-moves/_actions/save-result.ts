'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';
import type { StandardChallengeInput } from '../../_lib/create-save-result-action';

export type SaveLegalMovesResultInput = StandardChallengeInput & {
  selectedPiece: string;
};

const saveAction = createSaveResultAction<SaveLegalMovesResultInput>('legal_moves', (input) => ({
  selectedPiece: input.selectedPiece,
}));

export async function saveLegalMovesResult(input: SaveLegalMovesResultInput) {
  return saveAction(input);
}

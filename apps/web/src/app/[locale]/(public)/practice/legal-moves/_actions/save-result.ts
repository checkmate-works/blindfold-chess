'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveLegalMovesResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  selectedPiece: string;
};

export async function saveLegalMovesResult(input: SaveLegalMovesResultInput) {
  return savePracticeResult(
    'legal_moves',
    { selectedPiece: input.selectedPiece },
    {
      score: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    }
  );
}

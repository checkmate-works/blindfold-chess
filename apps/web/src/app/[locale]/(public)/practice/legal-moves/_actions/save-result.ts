'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';
import { buildLegalMovesData } from './save-result-logic';
import type { SaveLegalMovesResultInput } from './save-result-logic';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export async function saveLegalMovesResult(input: SaveLegalMovesResultInput) {
  const { menuType, settings, result } = buildLegalMovesData(input);
  return savePracticeResult(menuType, settings, result, {
    score: input.correctAnswers,
    incorrectAnswers: input.incorrectAnswers,
    timeTaken: input.timeTaken,
  });
}

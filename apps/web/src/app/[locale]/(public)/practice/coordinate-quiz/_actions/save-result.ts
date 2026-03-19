'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';
import { buildCoordinateQuizData } from './save-result-logic';
import type { SaveCoordinateQuizResultInput } from './save-result-logic';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export async function saveCoordinateQuizResult(input: SaveCoordinateQuizResultInput) {
  const { menuType, settings, result } = buildCoordinateQuizData(input);
  return savePracticeResult(menuType, settings, result, {
    score: input.correctAnswers,
    incorrectAnswers: input.incorrectAnswers,
    timeTaken: input.timeTaken,
  });
}

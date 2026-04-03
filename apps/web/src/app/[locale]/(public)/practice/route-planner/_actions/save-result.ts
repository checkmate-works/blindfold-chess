'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveRoutePlannerResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  piece: string;
};

export async function saveRoutePlannerResult(input: SaveRoutePlannerResultInput) {
  return savePracticeResult(
    'route_planner',
    { selectedPiece: input.piece },
    {
      score: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    }
  );
}

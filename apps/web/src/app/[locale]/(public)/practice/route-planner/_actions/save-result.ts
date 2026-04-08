'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export type SaveRoutePlannerResultInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
  piece: string;
};

const saveAction = createSaveResultAction<SaveRoutePlannerResultInput>(
  'route_planner',
  (input) => ({
    selectedPiece: input.piece,
  })
);

export async function saveRoutePlannerResult(input: SaveRoutePlannerResultInput) {
  return saveAction(input);
}

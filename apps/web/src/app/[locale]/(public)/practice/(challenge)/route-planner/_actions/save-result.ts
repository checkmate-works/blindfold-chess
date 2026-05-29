'use server';

import { createSaveResultAction } from '../../_lib/create-save-result-action';
import type { StandardChallengeInput } from '../../_lib/create-save-result-action';

export type SaveRoutePlannerResultInput = StandardChallengeInput & {
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

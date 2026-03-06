'use server';

import { savePracticeResult } from '../../_actions/save-practice-result';
import { buildSquareColorsData } from './save-result-logic';
import type { SaveSquareColorsResultInput } from './save-result-logic';

export type { SaveResultResponse } from '../../_actions/save-practice-result';

export async function saveSquareColorsResult(input: SaveSquareColorsResultInput) {
  const { menuType, settings, result } = buildSquareColorsData(input);
  return savePracticeResult(menuType, settings, result);
}

import type { PracticeMenuType } from '@/lib/db/practice-menu-types';

import type { SaveResultResponse } from '../_actions/save-practice-result';
import { savePracticeResult } from '../_actions/save-practice-result';

type StandardInput = {
  correctAnswers: number;
  incorrectAnswers: number;
  timeTaken: number;
};

/**
 * Factory that creates a save-result action for a practice module.
 *
 * Each module's `save-result.ts` file must still have its own `'use server'` directive
 * and export an async function that delegates to the returned function.
 *
 * @param moduleKey - The practice menu type key (e.g. 'coordinate_quiz')
 * @param extractSettings - Optional function to extract module-specific settings from the input
 */
export function createSaveResultAction<T extends StandardInput>(
  moduleKey: PracticeMenuType,
  extractSettings?: (input: T) => Record<string, unknown>
): (input: T) => Promise<SaveResultResponse> {
  return (input: T) => {
    const settings = extractSettings ? extractSettings(input) : {};
    return savePracticeResult(moduleKey, settings, {
      score: input.correctAnswers,
      incorrectAnswers: input.incorrectAnswers,
      timeTaken: input.timeTaken,
    });
  };
}

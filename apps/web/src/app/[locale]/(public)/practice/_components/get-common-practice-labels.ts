import type { PracticeCompleteLabels } from './practice-complete-types';

/**
 * Returns the common labels shared across most PracticeComplete usages.
 *
 * Includes: practiceComplete, score, tryAgain, morePractice, relatedLearning.
 * Each ResultClient can spread these and override or extend as needed.
 */
export function getCommonPracticeCompleteLabels(
  tPractice: (key: string) => string
): Pick<
  PracticeCompleteLabels,
  'practiceComplete' | 'score' | 'tryAgain' | 'morePractice' | 'relatedLearning'
> {
  return {
    practiceComplete: tPractice('practiceComplete'),
    score: tPractice('score'),
    tryAgain: tPractice('tryAgain'),
    morePractice: tPractice('changeSettings'),
    relatedLearning: tPractice('relatedLearning'),
  };
}

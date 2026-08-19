'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ScoreCounter } from './ScoreCounter';
import { TrainingChallengeCTA } from './TrainingChallengeCTA';

/**
 * The quiet, low-emphasis affordance for a training action that is not the
 * point of the screen — ending the session, skipping a problem.
 */
export const TRAINING_TEXT_ACTION_CLASSES =
  'text-sm text-muted-foreground hover:text-foreground transition-colors';

type Props = {
  correct: number;
  incorrect: number;
  onEndTraining: () => void;
  /** Where "ready for the challenge?" sends the player. */
  challengeHref: string;
  /**
   * Actions shown above "end training", each in its own block — the diagonal
   * quiz's skip is the only one today.
   */
  children?: ReactNode;
  /**
   * Spacing above the score line. Defaults to what six of the seven training
   * screens use; the coordinate quiz sits closer to its board.
   */
  scoreClassName?: string;
};

/**
 * Everything below a training screen's question panel: the running score,
 * the way out of training mode, and the pitch to switch to the scored
 * challenge.
 *
 * Seven screens assembled these three by hand. The copies had already
 * drifted — the score spacing in one, and the quadrants CTA pointing at
 * `/challenge` (the setup screen) where every other module links to
 * `/challenge/session`. Composing it once does not resolve either
 * difference, but it makes both of them visible as arguments at the call
 * site rather than as a diff between two files nobody reads side by side.
 */
export function TrainingFooter({
  correct,
  incorrect,
  onEndTraining,
  challengeHref,
  children,
  scoreClassName = 'mt-8',
}: Props) {
  const tp = useTranslations('practice');

  return (
    <>
      <ScoreCounter correct={correct} incorrect={incorrect} className={scoreClassName} />

      <div className="mt-6 text-center space-y-2">
        {children}
        <div>
          <button onClick={onEndTraining} className={TRAINING_TEXT_ACTION_CLASSES}>
            {tp('endTraining')}
          </button>
        </div>
      </div>

      <TrainingChallengeCTA challengeHref={challengeHref} />
    </>
  );
}

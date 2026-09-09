'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { ScoreCounter } from './ScoreCounter';
import { TrainingChallengeCTA } from './TrainingChallengeCTA';

/**
 * The text actions below the score — skip, end training — take the muted
 * link treatment, the same one the challenge sessions' "Quit" uses. They
 * used to be plain `text-muted-foreground hover:text-foreground`, which on a
 * phone is indistinguishable from a caption: nothing around a lone word
 * under the score says it can be tapped, and the hover shift never fires.
 * That is exactly the case {@link TEXT_LINK_MUTED_CLASSES} exists for.
 */
const TEXT_ACTION_CLASSES = `text-sm ${TEXT_LINK_MUTED_CLASSES}`;

type Props = {
  correct: number;
  incorrect: number;
  onEndTraining: () => void;
  /**
   * Where "ready for the challenge?" sends the player — normally the
   * module's `/challenge/session`. Two modules deliberately point at the
   * setup screen instead: the quadrant drill (the only unranked challenge,
   * and that screen is where it says so) and the route planner (its session
   * takes the piece set from the URL, so there is no session to land on
   * before the player has picked one).
   */
  challengeHref: string;
  /**
   * Skips the current problem. Rendered above "end training" when given —
   * omit it (or pass `undefined` while input is frozen) to hide the action.
   */
  onSkip?: () => void;
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
 * Seven screens assembled these three by hand, and two of them differ:
 * the coordinate quiz sits closer to its board, and the quadrant drill
 * sends players to its challenge *setup* screen rather than straight into
 * a session, because it is the only unranked challenge and that screen is
 * where it says so. Composing the footer once does not resolve either
 * difference — it makes both visible as arguments at the call site, where
 * the quadrants one carries its reason, instead of as a diff between two
 * files nobody reads side by side.
 */
export function TrainingFooter({
  correct,
  incorrect,
  onEndTraining,
  challengeHref,
  onSkip,
  scoreClassName = 'mt-8',
}: Props) {
  const tp = useTranslations('practice');

  return (
    <>
      <ScoreCounter correct={correct} incorrect={incorrect} className={scoreClassName} />

      <div className="mt-6 text-center space-y-2">
        {onSkip && (
          <div>
            <button onClick={onSkip} className={TEXT_ACTION_CLASSES}>
              {tp('skip')}
            </button>
          </div>
        )}
        <div>
          <button onClick={onEndTraining} className={TEXT_ACTION_CLASSES}>
            {tp('endTraining')}
          </button>
        </div>
      </div>

      <TrainingChallengeCTA challengeHref={challengeHref} />
    </>
  );
}

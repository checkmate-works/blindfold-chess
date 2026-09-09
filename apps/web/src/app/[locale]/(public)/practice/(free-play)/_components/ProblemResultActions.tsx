'use client';

import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  /**
   * Namespace holding `tutorialComplete`, `finishTutorial`, `viewResults` and
   * `nextProblem`, spelled the same under every practice module.
   */
  namespace: string;
  isTutorial: boolean;
  isLastProblem: boolean;
  onNextProblem: () => void;
  onViewResults: () => void;
  onFinishTutorial?: () => void;
  /**
   * Secondary actions rendered under the primary button outside the tutorial
   * (position-memory adds "analyze on Lichess"). When present the buttons
   * stack in a `space-y-3` column; when absent the primary button stands
   * alone, as it always has on the FEN drill.
   */
  extraActions?: ReactNode;
};

/**
 * The button that closes a per-problem result: finish the tutorial, view the
 * session results after the last problem, or move on to the next one.
 */
export function ProblemResultActions({
  namespace,
  isTutorial,
  isLastProblem,
  onNextProblem,
  onViewResults,
  onFinishTutorial,
  extraActions,
}: Props) {
  const t = useTranslations(namespace);

  if (isTutorial) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground whitespace-pre-line">{t('tutorialComplete')}</p>
        <Button onClick={onFinishTutorial} variant="primary" size="lg" fullWidth>
          {t('finishTutorial')}
        </Button>
      </div>
    );
  }

  const primary = isLastProblem ? (
    <Button onClick={onViewResults} variant="primary" size="lg" fullWidth>
      {t('viewResults')}
    </Button>
  ) : (
    <Button onClick={onNextProblem} variant="primary" size="lg" fullWidth>
      {t('nextProblem')}
    </Button>
  );

  if (!extraActions) return primary;

  return (
    <div className="space-y-3">
      {primary}
      {extraActions}
    </div>
  );
}

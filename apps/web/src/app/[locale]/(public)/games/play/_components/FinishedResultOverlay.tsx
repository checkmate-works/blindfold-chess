'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { RESULT_LABEL_KEY, ResultIcon } from '../_lib/result-visuals';

type Props = {
  /** Terminal result labelling the overlay; null renders the draw label. */
  result?: 'win' | 'loss' | 'draw' | null;
  /**
   * Reopen the game-finished "next action" modal. When provided, a trigger
   * button sits in the overlay (pointer-events re-enabled just for it).
   */
  onNextAction?: () => void;
};

/**
 * The result veil laid over the (frozen) mutating controls once an AI game has
 * ended — the win/loss/draw icon + label, an "ended" hint, and an optional
 * button to reopen the next-action modal. Split out of {@link GameInProgressPanel}
 * so the finished-review presentation stays separate from the in-progress
 * control wiring. Deliberately NO frosted tint/blur here — that reads as the
 * blindfold "tap to reveal" mask; the controls beneath are made inert by their
 * own `disabled` state, this is just the result + an "over" hint.
 */
export function FinishedResultOverlay({ result, onNextAction }: Props) {
  const t = useTranslations('play');

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-lg bg-background/80 text-center">
      {result && <ResultIcon result={result} className="w-8 h-8" />}
      <span className="text-lg font-bold">{t(RESULT_LABEL_KEY[result ?? 'draw'])}</span>
      <span className="text-sm text-muted-foreground">{t('finishedGame.heading')}</span>
      {onNextAction && (
        <Button variant="primary" onClick={onNextAction} className="pointer-events-auto mt-2">
          {t('finishModal.trigger')}
        </Button>
      )}
    </div>
  );
}

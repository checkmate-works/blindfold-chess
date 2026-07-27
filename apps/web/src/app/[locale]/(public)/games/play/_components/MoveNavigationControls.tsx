'use client';

import { useTranslations } from 'next-intl';

type Props = {
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
};

/**
 * On a phone the four buttons stretch to fill the row (~80px wide each) and
 * stand 56px tall; from `sm` up they collapse to the compact 48px centred
 * cluster. Four identical glyphs packed into 48px squares 4px apart is a
 * mis-tap trap for a thumb, while a mouse hits it precisely — so the touch
 * target grows only where the input is a finger.
 *
 * Boards render this through `MoveNavigationRow`, which owns the strip around
 * it; import this directly only where there is no such strip (a moves panel).
 */
const BUTTON_CLASS =
  'flex-1 h-14 flex items-center justify-center hover:bg-muted active:bg-muted rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:active:bg-transparent font-mono text-3xl sm:flex-none sm:w-12 sm:h-12 sm:text-2xl';

export function MoveNavigationControls({
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  isPreviousDisabled,
  isNextDisabled,
}: Props) {
  const t = useTranslations('Common.moveNavigation');

  return (
    <div className="w-full flex justify-center gap-1.5 sm:w-auto sm:gap-1">
      <button
        type="button"
        onClick={onNavigateToStart}
        className={BUTTON_CLASS}
        aria-label={t('goToStart')}
        disabled={isPreviousDisabled}
      >
        «
      </button>
      <button
        type="button"
        onClick={onNavigatePrevious}
        className={BUTTON_CLASS}
        aria-label={t('previousMove')}
        disabled={isPreviousDisabled}
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onNavigateNext}
        className={BUTTON_CLASS}
        aria-label={t('nextMove')}
        disabled={isNextDisabled}
      >
        ›
      </button>
      <button
        type="button"
        onClick={onNavigateToEnd}
        className={BUTTON_CLASS}
        aria-label={t('goToEnd')}
        disabled={isNextDisabled}
      >
        »
      </button>
    </div>
  );
}

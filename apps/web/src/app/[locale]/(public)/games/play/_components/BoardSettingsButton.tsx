'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaCog } from 'react-icons/fa';

type Props = {
  onClick: () => void;
};

/**
 * Per-game settings gear, pinned to the board's top-right corner (the move-list
 * strip's right end when the board is shown; the top-right of the blindfold
 * mask when it is masked). Carries a small frosted background so it stays
 * legible over either the move list or the frosted overlay.
 */
export function BoardSettingsButton({ onClick }: Props) {
  const t = useTranslations('play');
  return (
    <button
      type="button"
      onClick={onClick}
      title={t('settings.title')}
      aria-label={t('settings.title')}
      // Anchor for the play help tour (see PlayHelpTour).
      data-tour-id="play-settings-gear"
      className="rounded-full bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground"
    >
      <FaCog className="h-4 w-4" />
    </button>
  );
}

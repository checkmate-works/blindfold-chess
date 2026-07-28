'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

type Props = {
  /** True while the board shows the fully revealed position. */
  revealed: boolean;
  onToggle: () => void;
};

/**
 * Reveal / as-played switch for a finished game's board, pinned to the board's
 * top-right corner in place of the in-progress settings gear.
 *
 * Only rendered for games that actually hid something (`hidesAnyPiece`) — for a
 * sighted game both states look identical, and an inert toggle is worse than no
 * toggle. The icon shows the action, not the state: an open eye offers the
 * reveal, a struck-through eye offers the way back to the blindfolded view.
 */
export function BoardRevealToggle({ revealed, onToggle }: Props) {
  const t = useTranslations('play');
  const label = revealed ? t('finishedGame.showAsPlayed') : t('finishedGame.revealPosition');

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={revealed}
      className="rounded-full bg-background/80 p-1.5 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground"
    >
      {revealed ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
    </button>
  );
}

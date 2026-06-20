'use client';

import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChartLine, FaClipboardList, FaFlagCheckered, FaShareAlt } from 'react-icons/fa';

type Props = {
  /**
   * The always-visible board element the parent renders, wired non-interactive
   * (see PlayClient). Lets a finished game be reviewed in the familiar board UI.
   */
  inlineBoardView?: ReactNode;
  /** Navigate to this finished game's result screen. */
  onViewResult: () => void;
  /** Launch the postmortem (memory replay) for this game. */
  onPostmortem: () => void;
  /** Whether to offer the postmortem action (only when the game has moves). */
  showPostmortem: boolean;
  /**
   * Share this game: publish it (or open it if already published). Omitted when
   * the game has no moves to share.
   */
  onShare?: () => void;
  /** Whether this game was already published from this browser. */
  isShared?: boolean;
  /** Open the Game Details modal (engine / settings / change log). */
  onShowOperationLog?: () => void;
};

/**
 * Read-only counterpart to {@link GameInProgressPanel} for a finished game.
 * Reuses the same board + Game Details surfaces so a player can review moves
 * and operation logs in the familiar UI, but drops every input affordance
 * (move input, undo, resign) since the game is over. A banner makes the
 * finished state explicit and links across to the result and postmortem
 * screens, completing the result ⇄ game ⇄ postmortem navigation hub.
 */
export function FinishedGamePanel({
  inlineBoardView,
  onViewResult,
  onPostmortem,
  showPostmortem,
  onShare,
  isShared,
  onShowOperationLog,
}: Props) {
  const t = useTranslations('play');

  return (
    <div className="flex flex-col gap-6">
      {inlineBoardView}

      {/* Finished state — makes the read-only state explicit and links out
          to the result and postmortem screens. */}
      <p className="text-sm font-medium text-muted-foreground text-center">
        {t('finishedGame.heading')}
      </p>
      <div className="flex flex-col items-center gap-3">
        <Button
          variant="primary"
          fullWidth
          icon={<FaFlagCheckered className="w-4 h-4" />}
          onClick={onViewResult}
          className="rounded-lg"
        >
          {t('finishedGame.viewResult')}
        </Button>
        {onShare && (
          <Button
            variant="secondary"
            fullWidth
            icon={<FaShareAlt className="w-4 h-4" />}
            onClick={onShare}
            className="rounded-lg"
          >
            {isShared ? t('result.viewShared') : t('result.publish')}
          </Button>
        )}
        {showPostmortem && (
          <Button
            variant="secondary"
            fullWidth
            icon={<FaChartLine className="w-4 h-4" />}
            onClick={onPostmortem}
            className="rounded-lg"
          >
            {t('postmortem')}
          </Button>
        )}
      </div>

      {/* Game Details (engine / initial settings / change log). */}
      {onShowOperationLog && (
        <div className="flex justify-end items-center gap-2 text-muted-foreground">
          <button
            type="button"
            onClick={onShowOperationLog}
            className="p-1 leading-none hover:text-foreground"
            title={t('gameDetails.title')}
          >
            <FaClipboardList className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

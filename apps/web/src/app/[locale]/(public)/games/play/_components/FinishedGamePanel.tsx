'use client';

import type { ReactNode } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChartLine, FaClipboardList, FaFlagCheckered } from 'react-icons/fa';

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
  onShowOperationLog,
}: Props) {
  const t = useTranslations('play');

  return (
    <div className="flex flex-col gap-6">
      {inlineBoardView}

      {/* Finished banner — makes the read-only state explicit and links out
          to the result and postmortem screens. */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground text-center">
          {t('finishedGame.heading')}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-center">
          <Button
            variant="primary"
            icon={<FaFlagCheckered className="w-4 h-4" />}
            onClick={onViewResult}
            className="rounded-lg"
          >
            {t('finishedGame.viewResult')}
          </Button>
          {showPostmortem && (
            <Button
              variant="secondary"
              icon={<FaChartLine className="w-4 h-4" />}
              onClick={onPostmortem}
              className="rounded-lg"
            >
              {t('postmortem')}
            </Button>
          )}
        </div>
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

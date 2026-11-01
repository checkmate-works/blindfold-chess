'use client';

import { type ReactNode, useState } from 'react';

import { Button, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { boardFlatToFen, fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';
import { FaChessBoard, FaEraser } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { useEditableBoardLabels } from '../../../_hooks/use-editable-board-labels';
import type { PositionData } from '../../_lib/types';

type Props = {
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
  isTutorial?: boolean;
  showSkip?: boolean;
  /**
   * Whether the "view again" link (back to the memorize phase) is offered.
   * False when the session skips memorize: the auto-MEMORIZED effect fires
   * again the instant the machine re-enters `memorize`, so the link would
   * flash the answer for one frame and bounce straight back — a broken
   * affordance and, for the in-game position check, an answer leak.
   */
  showViewAgain?: boolean;
  /**
   * Replaces the quit link in the action cluster. The in-game position check
   * passes its "back to game" link here: for that flow quit's destination —
   * confirm modal, then a result marked skipped — is a strictly worse spelling
   * of the same intent, and there is no run worth a confirmation to protect.
   * Generic sessions leave this unset and keep the quit link.
   */
  exitAction?: ReactNode;
  /**
   * The position the game this check came from started at. When set, a
   * button loads it onto the board so the solver can replay the game in
   * their head from a familiar picture instead of placing all 32 pieces one
   * by one. Only offered while the board is empty, so it can never silently
   * overwrite pieces the solver has already placed — clearing first is an
   * explicit, confirmed step. Unset outside the in-game position check, where
   * no starting position exists.
   */
  startFen?: string;
  onPositionChange: (fen: string) => void;
  onSubmit: () => void;
  onViewAgain: () => void;
  onSkip: () => void;
  onQuit: () => void;
};

const EMPTY_PLACEMENT = '8/8/8/8/8/8/8/8';

/** Sized to sit in one row with {@link FlipBoardButton} (same padding/border). */
const TOOL_BUTTON_CLASSES =
  'inline-flex items-center gap-1.5 p-2 border border-border rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground';

export function PositionMemoryRecreate({
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  problemCount,
  boardTheme = DEFAULT_BOARD_THEME,
  isTutorial = false,
  showSkip = true,
  showViewAgain = true,
  exitAction,
  startFen,
  onPositionChange,
  onSubmit,
  onViewAgain,
  onSkip,
  onQuit,
}: Props) {
  const t = useTranslations('practice.positionMemory');

  // Board orientation is a local view preference during recreation — it does
  // not change the answer, only how the solver looks at the board. Seed it from
  // the original position's stored orientation so the board opens the way the
  // position was authored, then let the solver flip freely.
  const [flipped, setFlipped] = useState(originalPosition.isBlackToMove);

  const editableBoardLabels = useEditableBoardLabels('practice.positionMemory');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isBoardEmpty = fenToBoardFlat(recreatedPosition).every((piece) => piece === '');

  // Both actions replace only the piece placement; the side-to-move / castling
  // fields keep tracking the original position, as every board edit does
  // (`preserveTurnInfo` on the board below).
  const replacePlacement = (placementFen: string) =>
    onPositionChange(
      boardFlatToFen(fenToBoardFlat(placementFen), { preserveFrom: originalPosition.fen })
    );
  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    replacePlacement(EMPTY_PLACEMENT);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-6">
        {/* Progress */}
        {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

        {/* Instruction */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg text-muted-foreground">{t('recreatePosition')}</p>
          <div className="flex shrink-0 items-center gap-2">
            {startFen && (
              <button
                type="button"
                onClick={() => replacePlacement(startFen)}
                disabled={!isBoardEmpty}
                title={isBoardEmpty ? undefined : t('loadStartPositionDisabled')}
                className={TOOL_BUTTON_CLASSES}
              >
                <FaChessBoard className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t('loadStartPosition')}</span>
                <span className="sm:hidden">{t('loadStartPositionShort')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={isBoardEmpty}
              className={TOOL_BUTTON_CLASSES}
            >
              <FaEraser className="h-4 w-4" aria-hidden />
              <span>{t('clearBoard')}</span>
            </button>
            <FlipBoardButton onClick={() => setFlipped((prev) => !prev)} title={t('flipBoard')} />
          </div>
        </div>

        {/* Chess Board */}
        <EditableChessBoard
          expandBoardOnMobile
          fen={recreatedPosition}
          onFenChange={onPositionChange}
          labels={editableBoardLabels}
          flipped={flipped}
          editable={true}
          preserveTurnInfo={true}
          originalPosition={originalPosition.fen}
          boardTheme={boardTheme}
        />

        {/* Submit Button */}
        <Button onClick={onSubmit} variant="primary" size="lg" fullWidth>
          {t('submit')}
        </Button>
      </div>

      {/* Action Links */}
      {!isTutorial && (
        <div className="flex flex-col items-center gap-2">
          {showViewAgain && (
            <button onClick={onViewAgain} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
              {t('viewAgain')}
            </button>
          )}
          {showSkip && (
            <button onClick={onSkip} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
              {t('skip')}
            </button>
          )}
          {exitAction ?? (
            <button onClick={onQuit} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
              {t('quit')}
            </button>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={showClearConfirm}
        title={t('clearBoardConfirmTitle')}
        message={t('clearBoardConfirmMessage')}
        confirmText={t('clearBoardConfirmYes')}
        cancelText={t('clearBoardConfirmNo')}
        confirmVariant="danger"
        onConfirm={handleConfirmClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}

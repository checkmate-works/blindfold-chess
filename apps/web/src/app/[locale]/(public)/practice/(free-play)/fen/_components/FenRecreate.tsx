'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaSyncAlt } from 'react-icons/fa';

import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME } from '@/lib/games/board-themes';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
  showCoordinates?: boolean;
  isTutorial?: boolean;
  onPositionChange: (fen: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onQuit: () => void;
};

export function FenRecreate({
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  problemCount,
  boardTheme = DEFAULT_BOARD_THEME,
  showCoordinates = true,
  isTutorial = false,
  onPositionChange,
  onSubmit,
  onSkip,
  onQuit,
}: Props) {
  const t = useTranslations('practice.fen');
  const [isFlipped, setIsFlipped] = useState(originalPosition.isBlackToMove);

  const editableBoardLabels = useMemo(
    () => ({
      whitePieces: t('whitePieces'),
      blackPieces: t('blackPieces'),
      removePieceMode: t('removePieceMode'),
      placingPiece: t('placingPiece'),
    }),
    [t]
  );

  return (
    <div className="space-y-4">
      <div className="p-4">
        <div className="flex flex-col gap-6">
          {/* Progress */}
          {problemCount > 1 && (
            <ProgressBar current={currentProblemIndex + 1} total={problemCount} />
          )}

          {/* FEN Display */}
          <div>
            <p className="text-lg text-muted-foreground mb-3">{t('recreateFromFen')}</p>
            <div
              onClick={() => {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(document.getElementById('fen-display')!);
                selection?.removeAllRanges();
                selection?.addRange(range);
              }}
              id="fen-display"
              className="w-full px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm cursor-pointer break-all"
            >
              {originalPosition.fen}
            </div>
          </div>

          {/* Chess Board */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="p-2 border border-border rounded-md hover:bg-muted"
                  title={t('flipBoard')}
                >
                  <FaSyncAlt className="w-4 h-4" />
                </button>
              </div>
              <EditableChessBoard
                fen={recreatedPosition}
                onFenChange={onPositionChange}
                labels={editableBoardLabels}
                flipped={isFlipped}
                editable={true}
                preserveTurnInfo={true}
                originalPosition={originalPosition.fen}
                boardTheme={boardTheme}
                showCoordinates={showCoordinates}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button onClick={onSubmit} variant="primary" size="lg" fullWidth>
            {t('submit')}
          </Button>
        </div>
      </div>

      {/* Skip/Quit Links */}
      {!isTutorial && (
        <div className="flex flex-col items-center gap-2">
          <button onClick={onSkip} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('skip')}
          </button>
          <button onClick={onQuit} className={`text-sm ${TEXT_LINK_MUTED_CLASSES}`}>
            {t('quit')}
          </button>
        </div>
      )}
    </div>
  );
}

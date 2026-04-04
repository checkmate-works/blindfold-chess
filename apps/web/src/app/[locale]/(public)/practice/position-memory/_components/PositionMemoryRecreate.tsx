'use client';

import { useMemo } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { BoardTheme } from '@/lib/boardThemes';
import { DEFAULT_BOARD_THEME } from '@/lib/boardThemes';

import { EditableChessBoard } from '@/app/[locale]/(public)/practice/_components/EditableChessBoard';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';

import type { PositionData } from '../_lib/types';

type Props = {
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
  isTutorial?: boolean;
  onPositionChange: (fen: string) => void;
  onSubmit: () => void;
  onViewAgain: () => void;
  onSkip: () => void;
  onQuit: () => void;
};

export function PositionMemoryRecreate({
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  problemCount,
  boardTheme = DEFAULT_BOARD_THEME,
  isTutorial = false,
  onPositionChange,
  onSubmit,
  onViewAgain,
  onSkip,
  onQuit,
}: Props) {
  const t = useTranslations('practice.positionMemory');

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
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Progress */}
          {problemCount > 1 && (
            <ProgressBar current={currentProblemIndex + 1} total={problemCount} />
          )}

          {/* Instruction */}
          <p className="text-lg text-muted-foreground">{t('recreatePosition')}</p>

          {/* Chess Board */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <EditableChessBoard
                fen={recreatedPosition}
                onFenChange={onPositionChange}
                labels={editableBoardLabels}
                flipped={originalPosition.isBlackToMove}
                editable={true}
                preserveTurnInfo={true}
                originalPosition={originalPosition.fen}
                boardTheme={boardTheme}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button onClick={onSubmit} variant="primary" size="lg" fullWidth>
            {t('submit')}
          </Button>
        </div>
      </div>

      {/* Action Links */}
      {!isTutorial && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onViewAgain}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('viewAgain')}
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('skip')}
          </button>
          <button
            onClick={onQuit}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('quit')}
          </button>
        </div>
      )}
    </div>
  );
}

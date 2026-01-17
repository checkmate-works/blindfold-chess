'use client';

import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import type { BoardTheme } from '@/lib/boardThemes';

import { SectionTitle } from '@/app/[locale]/_components';
import { EditableChessBoard } from '@/app/[locale]/practice/_components/EditableChessBoard';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';
import type { PositionData } from '@/app/[locale]/practice/_lib/types';

type Props = {
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
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
  boardTheme = 'default',
  isTutorial = false,
  onPositionChange,
  onSubmit,
  onSkip,
  onQuit,
}: Props) {
  const t = useTranslations('practice.fen');

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
    <div className="max-w-4xl mx-auto">
      {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

      <div className="text-center mb-6">
        <SectionTitle className="text-2xl font-bold mb-2">{t('recreateFromFen')}</SectionTitle>
      </div>

      {/* FEN Display - readonly textbox */}
      <div className="mb-6 max-w-md mx-auto">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          {t('fenString')}
        </label>
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

      <div className="flex flex-col items-center gap-4 mt-6">
        <Button onClick={onSubmit} variant="primary" size="lg" fullWidth className="rounded-md">
          {t('submit')}
        </Button>
        {!isTutorial && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

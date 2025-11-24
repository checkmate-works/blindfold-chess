'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import type { BoardTheme } from '@/lib/boardThemes';

import { SectionTitle } from '@/app/[locale]/_components';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import type { PositionData } from '../_lib/types';
import { EditableChessBoard } from './EditableChessBoard';

type Props = {
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
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
  boardTheme = 'default',
  onPositionChange,
  onSubmit,
  onViewAgain,
  onSkip,
  onQuit,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  return (
    <div className="max-w-4xl mx-auto">
      {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

      <div className="text-center mb-6">
        <SectionTitle className="text-2xl font-bold mb-2">{t('recreatePosition')}</SectionTitle>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <EditableChessBoard
            fen={recreatedPosition}
            onFenChange={onPositionChange}
            flipped={originalPosition.isBlackToMove}
            editable={true}
            preserveTurnInfo={true}
            originalPosition={originalPosition.fen}
            boardTheme={boardTheme}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mt-6">
        <Button onClick={onSubmit} variant="primary" size="lg" fullWidth className="rounded-lg">
          {t('submit')}
        </Button>
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
    </div>
  );
}

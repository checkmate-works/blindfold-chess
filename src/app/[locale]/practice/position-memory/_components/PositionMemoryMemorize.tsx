'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import type { BoardTheme } from '@/lib/boardThemes';

import { SectionTitle } from '@/app/[locale]/_components';
import { AnimatedChessBoard } from '@/app/[locale]/practice/_components/AnimatedChessBoard';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import type { PositionData } from '../_lib/types';

type Props = {
  position: PositionData;
  memorizeTimeLeft: number;
  currentProblemIndex: number;
  problemCount: number;
  boardTheme?: BoardTheme;
  onMemorized: () => void;
  onQuit: () => void;
};

export function PositionMemoryMemorize({
  position,
  memorizeTimeLeft,
  currentProblemIndex,
  problemCount,
  boardTheme = 'default',
  onMemorized,
  onQuit,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  return (
    <div className="max-w-4xl mx-auto">
      {problemCount > 1 && <ProgressBar current={currentProblemIndex + 1} total={problemCount} />}

      <div className="text-center mb-6">
        <SectionTitle className="text-2xl font-bold mb-2">{t('memorizing')}</SectionTitle>
        <p className="text-lg text-muted-foreground">
          {t('timeRemaining')}: {memorizeTimeLeft}
          {t('seconds')}
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="w-full max-w-md">
          <AnimatedChessBoard
            initialFen={position.fen}
            showCoordinates={true}
            flipped={position.isBlackToMove}
            boardTheme={boardTheme}
          />
        </div>
      </div>

      <div className="text-center space-y-4">
        <div>
          <Button
            onClick={onMemorized}
            variant="primary"
            size="md"
            className="px-6 py-3 rounded-lg"
          >
            {t('memorized')}
          </Button>
        </div>
        <div>
          <button
            onClick={onQuit}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('quit')}
          </button>
        </div>
      </div>
    </div>
  );
}

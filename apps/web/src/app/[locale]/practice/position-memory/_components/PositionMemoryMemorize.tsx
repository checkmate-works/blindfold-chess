'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import type { BoardTheme } from '@/lib/boardThemes';

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
  onSkip: () => void;
  onQuit: () => void;
};

export function PositionMemoryMemorize({
  position,
  memorizeTimeLeft,
  currentProblemIndex,
  problemCount,
  boardTheme = 'default',
  onMemorized,
  onSkip,
  onQuit,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Progress */}
          {problemCount > 1 && (
            <ProgressBar current={currentProblemIndex + 1} total={problemCount} />
          )}

          {/* Timer */}
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-2">{t('memorizing')}</p>
            <p className="text-2xl font-bold">
              <span className={memorizeTimeLeft <= 5 ? 'text-red-500' : ''}>
                {memorizeTimeLeft}
              </span>{' '}
              {t('seconds')}
            </p>
          </div>

          {/* Chess Board */}
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <AnimatedChessBoard
                initialFen={position.fen}
                showCoordinates={true}
                flipped={position.isBlackToMove}
                boardTheme={boardTheme}
              />
            </div>
          </div>

          {/* Memorized Button */}
          <Button onClick={onMemorized} variant="primary" size="lg" fullWidth>
            {t('memorized')}
          </Button>
        </div>
      </div>

      {/* Action Links */}
      <div className="flex flex-col items-center gap-2">
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

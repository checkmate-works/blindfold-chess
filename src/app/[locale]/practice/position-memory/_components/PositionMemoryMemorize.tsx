'use client';

import { useTranslations } from 'next-intl';
import { SectionTitle } from '@/app/[locale]/_components';
import { ChessBoard } from '../../_components/ChessBoard';
import { ProgressBar } from '../../_components/ProgressBar';
import type { PositionData } from '../_lib/types';

type Props = {
  position: PositionData;
  memorizeTimeLeft: number;
  currentProblemIndex: number;
  problemCount: number;
  onMemorized: () => void;
};

export function PositionMemoryMemorize({
  position,
  memorizeTimeLeft,
  currentProblemIndex,
  problemCount,
  onMemorized,
}: Props) {
  const t = useTranslations('practice.positionMemory');
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <ChessBoard
            initialFen={position.fen}
            showCoordinates={true}
            flipped={position.isBlackToMove}
          />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onMemorized}
          className="px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
        >
          {t('memorized')}
        </button>
      </div>
    </div>
  );
}

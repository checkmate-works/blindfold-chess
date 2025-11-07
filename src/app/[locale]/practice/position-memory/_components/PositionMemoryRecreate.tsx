'use client';

import { useTranslations } from 'next-intl';

import { SectionTitle } from '@/app/[locale]/_components';
import { ProgressBar } from '@/app/[locale]/practice/_components/ProgressBar';

import type { PositionData } from '../_lib/types';
import { EditableChessBoard } from './EditableChessBoard';

type Props = {
  originalPosition: PositionData;
  recreatedPosition: string;
  currentProblemIndex: number;
  problemCount: number;
  onPositionChange: (fen: string) => void;
  onSubmit: () => void;
  onViewAgain: () => void;
};

export function PositionMemoryRecreate({
  originalPosition,
  recreatedPosition,
  currentProblemIndex,
  problemCount,
  onPositionChange,
  onSubmit,
  onViewAgain,
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
          />
        </div>
      </div>

      <div className="text-center mt-6 space-y-4">
        <div>
          <button
            onClick={onSubmit}
            className="px-6 py-3 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
          >
            {t('submit')}
          </button>
        </div>
        <div>
          <button
            onClick={onViewAgain}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('viewAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}

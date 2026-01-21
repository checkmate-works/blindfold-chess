'use client';

import { useTranslations } from 'next-intl';

import type { BoardTheme } from '@/lib/boardThemes';

import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

import type { PieceType } from '../_lib/types';
import { PieceSelector } from './PieceSelector';

type Props = {
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  onTimeLimitChange: (timeLimit: number) => void;
  onPieceToggle: (piece: PieceType) => void;
  boardTheme?: BoardTheme;
};

export function LegalMovesSettings({
  timeLimit,
  selectedPieces,
  onTimeLimitChange,
  onPieceToggle,
  boardTheme = 'default',
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const hasSelectedPieces = Object.values(selectedPieces).some((selected) => selected);

  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <TimeSlider
        timeLimit={timeLimit}
        onTimeLimitChange={onTimeLimitChange}
        labels={{
          timeLimit: t('timeLimit'),
          seconds: t('seconds'),
        }}
      />

      {/* Piece Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-4">
          {t('pieceSelection')}
        </label>
        <PieceSelector
          selectedPieces={selectedPieces}
          onPieceToggle={onPieceToggle}
          boardTheme={boardTheme}
        />
        {!hasSelectedPieces && (
          <p className="mt-3 text-sm text-destructive text-center">{t('selectAtLeastOne')}</p>
        )}
      </div>
    </div>
  );
}

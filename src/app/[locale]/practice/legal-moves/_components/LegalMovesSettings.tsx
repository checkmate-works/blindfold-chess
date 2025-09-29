'use client';

import { useTranslations } from 'next-intl';
import type { PieceType } from '../_lib/types';
import { PieceSelector } from './PieceSelector';
import { TimeSlider } from '../../_components/TimeSlider';

type Props = {
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  onTimeLimitChange: (timeLimit: number) => void;
  onPieceToggle: (piece: PieceType) => void;
};

export function LegalMovesSettings({
  timeLimit,
  selectedPieces,
  onTimeLimitChange,
  onPieceToggle,
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
        <PieceSelector selectedPieces={selectedPieces} onPieceToggle={onPieceToggle} />
        {!hasSelectedPieces && (
          <p className="mt-3 text-sm text-destructive text-center">{t('selectAtLeastOne')}</p>
        )}
      </div>
    </div>
  );
}

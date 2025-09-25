'use client';

import { type PieceType } from '../_lib/legal-moves';
import { PieceSelector } from './PieceSelector';
import { TimeSlider } from '../../_components/TimeSlider';

interface LegalMovesSettingsProps {
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  onTimeLimitChange: (timeLimit: number) => void;
  onPieceToggle: (piece: PieceType) => void;
  locale?: 'en' | 'ja';
  translations: {
    timeLimit: string;
    seconds: string;
    pieceSelection: string;
    selectAtLeastOne: string;
    pieces: {
      bishop: string;
      knight: string;
      rook: string;
      queen: string;
      king: string;
    };
  };
}

export function LegalMovesSettings({
  timeLimit,
  selectedPieces,
  onTimeLimitChange,
  onPieceToggle,
  locale = 'en',
  translations,
}: LegalMovesSettingsProps) {
  const hasSelectedPieces = Object.values(selectedPieces).some((selected) => selected);

  return (
    <div className="space-y-6">
      {/* Time Limit */}
      <TimeSlider
        timeLimit={timeLimit}
        onTimeLimitChange={onTimeLimitChange}
        translations={{
          timeLimit: translations.timeLimit,
          seconds: translations.seconds,
        }}
        locale={locale}
      />

      {/* Piece Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-4">
          {translations.pieceSelection}
        </label>
        <PieceSelector
          selectedPieces={selectedPieces}
          onPieceToggle={onPieceToggle}
          translations={{ pieces: translations.pieces }}
        />
        {!hasSelectedPieces && (
          <p className="mt-3 text-sm text-destructive text-center">
            {translations.selectAtLeastOne}
          </p>
        )}
      </div>
    </div>
  );
}

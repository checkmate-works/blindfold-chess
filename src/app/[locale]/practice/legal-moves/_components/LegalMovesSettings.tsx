'use client';

import { type PieceType } from '../_lib/legal-moves';
import { PieceSelector } from './PieceSelector';

interface LegalMovesSettingsProps {
  questionCount: number;
  selectedPieces: Record<PieceType, boolean>;
  onQuestionCountChange: (count: number) => void;
  onPieceToggle: (piece: PieceType) => void;
  translations: {
    questionCount: string;
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
  questionCount,
  selectedPieces,
  onQuestionCountChange,
  onPieceToggle,
  translations,
}: LegalMovesSettingsProps) {
  const hasSelectedPieces = Object.values(selectedPieces).some((selected) => selected);

  return (
    <div className="space-y-6">
      {/* Question Count */}
      <div>
        <label htmlFor="questionCount" className="block text-sm font-medium text-foreground mb-2">
          {translations.questionCount}: {questionCount}
        </label>
        <input
          id="questionCount"
          type="range"
          min="10"
          max="50"
          step="10"
          value={questionCount}
          onChange={(e) => onQuestionCountChange(parseInt(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>10</span>
          <span>50</span>
        </div>
      </div>

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

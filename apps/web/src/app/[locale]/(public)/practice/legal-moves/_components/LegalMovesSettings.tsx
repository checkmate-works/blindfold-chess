'use client';

import { useTranslations } from 'next-intl';

import type { PieceSelection } from './PieceSelector';
import { PieceSelector } from './PieceSelector';

type Props = {
  pieceSelection: PieceSelection;
  onPieceSelect: (selection: PieceSelection) => void;
};

export function LegalMovesSettings({ pieceSelection, onPieceSelect }: Props) {
  const t = useTranslations('practice.legalMoves');

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-4">
          {t('pieceSelection')}
        </label>
        <PieceSelector selected={pieceSelection} onSelect={onPieceSelect} />
      </div>
    </div>
  );
}

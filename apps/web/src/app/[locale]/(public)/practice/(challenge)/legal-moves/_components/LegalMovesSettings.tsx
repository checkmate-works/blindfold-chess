'use client';

import { PieceSelector } from '@/app/_components';
import type { PieceSelection } from '@/app/_components/practice/PieceSelector';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

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
        <PieceSelector
          selected={pieceSelection}
          onSelect={onPieceSelect}
          // practice.legalMoves.pieces.<PieceType>: practice.legalMoves.pieces.b, practice.legalMoves.pieces.n, practice.legalMoves.pieces.r, practice.legalMoves.pieces.q, practice.legalMoves.pieces.k (PIECE_TYPES)
          getLabel={(s) => (s === 'random' ? t('pieces.random') : t(`pieces.${s}`))}
          showLabel
        />
      </div>
    </div>
  );
}

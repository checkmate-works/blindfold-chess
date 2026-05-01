'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { fenToPieceList, isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

type Props = {
  fen: string;
};

/**
 * Character-based piece list display ("White Pieces: Kh4 g2 h3").
 * Shared between the puzzle and position-memory features so both render
 * identically.
 *
 * Translation keys live under `practice.puzzle.detail` for historical
 * reasons — they are semantically piece-label strings, not puzzle-specific.
 */
export function PiecesInfo({ fen }: Props) {
  const t = useTranslations('practice.puzzle.detail');

  const isBlackToMove = isBlackToMoveFromFen(fen);
  const pieceList = fenToPieceList(fen);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <p className="text-sm font-medium text-foreground">
        {isBlackToMove ? t('blackToMove') : t('whiteToMove')}
      </p>
      <p className="text-sm text-foreground">
        <span className="font-medium">{t('whitePiecesLabel')}:</span>{' '}
        {pieceList.white.length > 0 ? pieceList.white.join(' ') : t('noPieces')}
      </p>
      <p className="text-sm text-foreground">
        <span className="font-medium">{t('blackPiecesLabel')}:</span>{' '}
        {pieceList.black.length > 0 ? pieceList.black.join(' ') : t('noPieces')}
      </p>
    </div>
  );
}

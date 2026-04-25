import { getTranslations } from 'next-intl/server';

import { fenToPieceList, isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  fen: string;
  locale: Locale;
};

export async function PuzzlePiecesInfo({ fen, locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'practice.puzzle.detail' });

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

'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import type { PieceSelection } from '@/app/_components/practice/PieceSelector';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { pieceDisplayMap } from '../_data/constants';
import { PIECE_TYPE_TO_NAME } from '../_lib/utils';
import { LegalMovesSettings } from './LegalMovesSettings';

type Props = {
  locale: Locale;
  pieceSelection: PieceSelection;
  onPieceSelect: (selection: PieceSelection) => void;
};

export function LegalMovesSetup({ locale, pieceSelection, onPieceSelect }: Props) {
  const t = useTranslations('practice.legalMoves');
  const tp = useTranslations('practice');

  const pieceName =
    pieceSelection === 'random' ? 'random' : (PIECE_TYPE_TO_NAME[pieceSelection] ?? 'random');

  return (
    <div>
      <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>
      <div className="mb-6 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
        <div className="text-lg font-bold text-foreground mb-3">
          {t('questionFormat', { from: 'e2', to: 'e4' })}
        </div>
        <div className="text-5xl mb-4">{pieceDisplayMap['n']}</div>
        <div className="grid grid-cols-2 gap-3 max-w-[200px] mx-auto">
          <button
            disabled
            className="px-4 py-2 bg-success/10 text-success border border-success/30 rounded-md font-medium transition-colors flex items-center justify-center gap-1 opacity-50 cursor-not-allowed"
          >
            <span className="text-lg">○</span>
            <span className="text-sm">{t('legal')}</span>
          </button>
          <button
            disabled
            className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-md font-medium transition-colors flex items-center justify-center gap-1 opacity-50 cursor-not-allowed"
          >
            <span className="text-lg">×</span>
            <span className="text-sm">{t('illegal')}</span>
          </button>
        </div>
      </div>

      <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

      <LegalMovesSettings pieceSelection={pieceSelection} onPieceSelect={onPieceSelect} />

      <Link href={`/${locale}/practice/legal-moves/challenge/session?piece=${pieceName}`}>
        <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full mt-6">
          {tp('startChallenge')}
        </Button>
      </Link>
      <div className="mt-4 text-center">
        <Link
          href={`/${locale}/practice/legal-moves/training?piece=${pieceName}#legal-moves-training-session`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('switchToTraining')}
        </Link>
      </div>
    </div>
  );
}

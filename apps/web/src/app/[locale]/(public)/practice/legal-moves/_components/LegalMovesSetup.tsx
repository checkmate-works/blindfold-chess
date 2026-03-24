'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { PieceSelection } from '@/app/_components/practice/PieceSelector';
import { FaPlay } from 'react-icons/fa';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

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
  const router = useRouter();

  const handleStart = () => {
    const pieceName =
      pieceSelection === 'random' ? 'random' : (PIECE_TYPE_TO_NAME[pieceSelection] ?? 'random');

    router.push(
      `/${locale}/practice/legal-moves/training?piece=${pieceName}#legal-moves-training-session`
    );
  };

  return (
    <PracticeLayout>
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
        </div>

        <LegalMovesSettings pieceSelection={pieceSelection} onPieceSelect={onPieceSelect} />

        <Button
          onClick={handleStart}
          variant="secondary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {tp('startTraining')}
        </Button>
        <Button
          onClick={() => router.push(`/${locale}/practice/legal-moves/challenge/session`)}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full mt-3"
        >
          {tp('startChallenge')}
        </Button>
      </div>
    </PracticeLayout>
  );
}

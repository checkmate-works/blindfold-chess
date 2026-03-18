'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { PieceSelection } from '@/app/_components/practice/PieceSelector';
import { FaPlay } from 'react-icons/fa';

import { PracticeLayout } from '@/app/[locale]/(public)/practice/_components/PracticeLayout';
import { SegmentedControl } from '@/app/[locale]/(public)/practice/_components/SegmentedControl';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType, PracticeMode } from '../_lib/types';
import { LegalMovesSettings } from './LegalMovesSettings';

type Props = {
  locale: Locale;
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
  pieceSelection: PieceSelection;
  onPieceSelect: (selection: PieceSelection) => void;
};

export function LegalMovesSetup({
  locale,
  mode,
  onModeChange,
  pieceSelection,
  onPieceSelect,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const tp = useTranslations('practice');
  const router = useRouter();

  const pieces: PieceType[] = ['k', 'q', 'r', 'b', 'n'];

  const modeOptions: { value: PracticeMode; label: string }[] = [
    { value: 'training', label: tp('modeTraining') },
    { value: 'timed', label: tp('modeTimed') },
  ];

  const handleStart = () => {
    const piecesParam = pieceSelection === 'random' ? pieces.join(',') : pieceSelection;

    if (mode === 'training') {
      router.push(
        `/${locale}/practice/legal-moves/training?pieces=${piecesParam}#legal-moves-training-session`
      );
    } else {
      router.push(
        `/${locale}/practice/legal-moves/challenge?timeLimit=60&pieces=${piecesParam}#legal-moves-session`
      );
    }
  };

  return (
    <PracticeLayout>
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <SegmentedControl options={modeOptions} value={mode} onChange={onModeChange} />
        </div>

        {mode === 'training' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
          </div>
        )}

        {mode === 'timed' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{tp('challengeDescription')}</p>
          </div>
        )}

        <LegalMovesSettings pieceSelection={pieceSelection} onPieceSelect={onPieceSelect} />

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {mode === 'training' ? tp('startTraining') : t('start')}
        </Button>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mt-8 space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            href="/learn/moves/king-movement"
            icon="♔"
            title={t('articles.king.title')}
            description={t('articles.king.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/moves/knight-movement"
            icon="♘"
            title={t('articles.knight.title')}
            description={t('articles.knight.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/moves/rook-movement"
            icon="♜"
            title={t('articles.rook.title')}
            description={t('articles.rook.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/moves/bishop-movement"
            icon="♗"
            title={t('articles.bishop.title')}
            description={t('articles.bishop.description')}
            locale={locale}
          />
        </div>
      </div>
    </PracticeLayout>
  );
}

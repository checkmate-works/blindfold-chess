'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { SegmentedControl } from '@/app/[locale]/practice/_components/SegmentedControl';

import type { PieceType, PracticeMode } from '../_lib/types';
import { LegalMovesSettings } from './LegalMovesSettings';

type Props = {
  locale: Locale;
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  onTimeLimitChange: (value: number) => void;
  onPieceToggle: (piece: PieceType) => void;
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
};

export function LegalMovesSetup({
  locale,
  timeLimit,
  selectedPieces,
  onTimeLimitChange,
  onPieceToggle,
  mode,
  onModeChange,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  const tp = useTranslations('practice');
  const router = useRouter();

  const hasSelectedPieces = Object.values(selectedPieces).some((selected) => selected);

  const modeOptions: { value: PracticeMode; label: string }[] = [
    { value: 'timed', label: tp('modeTimed') },
    { value: 'training', label: tp('modeTraining') },
  ];

  const handleStart = () => {
    const selectedPieceTypes = Object.entries(selectedPieces)
      .filter(([, selected]) => selected)
      .map(([piece]) => piece)
      .join(',');

    if (mode === 'training') {
      router.push(
        `/${locale}/practice/legal-moves/training?pieces=${selectedPieceTypes}#legal-moves-training-session`
      );
    } else {
      router.push(
        `/${locale}/practice/legal-moves/challenge?timeLimit=${timeLimit}&pieces=${selectedPieceTypes}#legal-moves-session`
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <SegmentedControl options={modeOptions} value={mode} onChange={onModeChange} />
        </div>

        <LegalMovesSettings
          timeLimit={timeLimit}
          selectedPieces={selectedPieces}
          onTimeLimitChange={onTimeLimitChange}
          onPieceToggle={onPieceToggle}
          showTimeSlider={mode === 'timed'}
        />

        {mode === 'training' && (
          <div className="mt-6 mb-6">
            <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
          </div>
        )}

        <Button
          onClick={handleStart}
          disabled={!hasSelectedPieces}
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
    </div>
  );
}

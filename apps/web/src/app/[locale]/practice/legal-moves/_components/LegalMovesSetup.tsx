'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';

import type { PieceType } from '../_lib/types';
import { LegalMovesSettings } from './LegalMovesSettings';

type Props = {
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  onTimeLimitChange: (value: number) => void;
  onPieceToggle: (piece: PieceType) => void;
  onStart: () => void;
  hasSelectedPieces: boolean;
};

export function LegalMovesSetup({
  timeLimit,
  selectedPieces,
  onTimeLimitChange,
  onPieceToggle,
  onStart,
  hasSelectedPieces,
}: Props) {
  const t = useTranslations('practice.legalMoves');
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <LegalMovesSettings
          timeLimit={timeLimit}
          selectedPieces={selectedPieces}
          onTimeLimitChange={onTimeLimitChange}
          onPieceToggle={onPieceToggle}
        />

        <Button
          onClick={onStart}
          disabled={!hasSelectedPieces}
          variant="primary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {t('start')}
        </Button>
      </div>
    </div>
  );
}

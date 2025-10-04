'use client';

import { useTranslations } from 'next-intl';

import { PrimaryButton, SectionTitle } from '@/app/[locale]/_components';

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

        <PrimaryButton onClick={onStart} disabled={!hasSelectedPieces} className="mt-6">
          {t('start')}
        </PrimaryButton>
      </div>
    </div>
  );
}

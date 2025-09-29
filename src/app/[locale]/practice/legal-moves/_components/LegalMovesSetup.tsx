'use client';

import { useTranslations } from 'next-intl';
import { SectionTitle, PrimaryButton } from '@/app/[locale]/_components';
import { LegalMovesSettings } from './LegalMovesSettings';
import type { PieceType } from '../_lib/types';
import type { Locale } from '../../../_lib/types';

type Props = {
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  onTimeLimitChange: (value: number) => void;
  onPieceToggle: (piece: PieceType) => void;
  onStart: () => void;
  hasSelectedPieces: boolean;
  locale: Locale;
};

export function LegalMovesSetup({
  timeLimit,
  selectedPieces,
  onTimeLimitChange,
  onPieceToggle,
  onStart,
  hasSelectedPieces,
  locale,
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
          locale={locale}
        />

        <PrimaryButton onClick={onStart} disabled={!hasSelectedPieces} className="mt-6">
          {t('start')}
        </PrimaryButton>
      </div>
    </div>
  );
}

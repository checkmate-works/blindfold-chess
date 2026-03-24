'use client';

import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesSetup } from './LegalMovesSetup';

type Props = {
  locale: Locale;
};

type LegalMovesLocalSettings = {
  pieceSelection: PieceSelection;
};

const STORAGE_KEY = 'legalMoves_settings';
const DEFAULTS: LegalMovesLocalSettings = {
  pieceSelection: 'random',
};

export function LegalMoves({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <LegalMovesSetup
      locale={locale}
      pieceSelection={settings.pieceSelection}
      onPieceSelect={(pieceSelection) => updateSettings({ pieceSelection })}
    />
  );
}

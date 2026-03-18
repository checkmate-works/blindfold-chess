'use client';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PracticeMode } from '../_lib/types';
import { LegalMovesSetup } from './LegalMovesSetup';
import type { PieceSelection } from './PieceSelector';

type Props = {
  locale: Locale;
};

type LegalMovesLocalSettings = {
  mode: PracticeMode;
  pieceSelection: PieceSelection;
};

const STORAGE_KEY = 'legalMoves_settings';
const DEFAULTS: LegalMovesLocalSettings = {
  mode: 'training',
  pieceSelection: 'random',
};

export function LegalMoves({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  return (
    <LegalMovesSetup
      locale={locale}
      mode={settings.mode}
      onModeChange={(mode) => updateSettings({ mode })}
      pieceSelection={settings.pieceSelection}
      onPieceSelect={(pieceSelection) => updateSettings({ pieceSelection })}
    />
  );
}

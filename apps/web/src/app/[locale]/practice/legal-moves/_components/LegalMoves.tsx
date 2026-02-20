'use client';

import type { Locale } from '@/app/[locale]/_lib/types';
import { usePersistentSettings } from '@/app/[locale]/practice/_hooks/usePersistentSettings';

import type { PieceType, PracticeMode } from '../_lib/types';
import { LegalMovesSetup } from './LegalMovesSetup';

type Props = {
  locale: Locale;
};

type LegalMovesLocalSettings = {
  timeLimit: number;
  selectedPieces: Record<PieceType, boolean>;
  mode: PracticeMode;
};

const STORAGE_KEY = 'legalMoves_settings';
const DEFAULTS: LegalMovesLocalSettings = {
  timeLimit: 60,
  selectedPieces: {
    king: true,
    queen: true,
    rook: true,
    bishop: true,
    knight: true,
  },
  mode: 'timed',
};

export function LegalMoves({ locale }: Props) {
  const { settings, updateSettings } = usePersistentSettings(STORAGE_KEY, DEFAULTS);

  const togglePiece = (piece: PieceType) => {
    updateSettings({
      selectedPieces: { ...settings.selectedPieces, [piece]: !settings.selectedPieces[piece] },
    });
  };

  return (
    <LegalMovesSetup
      locale={locale}
      timeLimit={settings.timeLimit}
      selectedPieces={settings.selectedPieces}
      onTimeLimitChange={(timeLimit) => updateSettings({ timeLimit })}
      onPieceToggle={togglePiece}
      mode={settings.mode}
      onModeChange={(mode) => updateSettings({ mode })}
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';

import type { PieceSelection } from '@/app/_components/practice/PieceSelector';

import { usePersistentSettings } from '@/app/[locale]/(public)/practice/_hooks/use-persistent-settings';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PracticeMode } from '../_lib/types';
import { LegalMovesSetup } from './LegalMovesSetup';

type Props = {
  locale: Locale;
  initialMode?: PracticeMode;
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

export function LegalMoves({ locale, initialMode }: Props) {
  const { settings, updateSettings, isLoaded } = usePersistentSettings(STORAGE_KEY, DEFAULTS);
  const appliedInitialMode = useRef(false);

  useEffect(() => {
    if (isLoaded && initialMode && !appliedInitialMode.current) {
      appliedInitialMode.current = true;
      updateSettings({ mode: initialMode });
    }
  }, [isLoaded, initialMode, updateSettings]);

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

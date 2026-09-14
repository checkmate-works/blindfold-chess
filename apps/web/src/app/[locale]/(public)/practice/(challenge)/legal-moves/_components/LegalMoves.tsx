'use client';

import type { Locale } from '@/app/[locale]/_lib/types';

import { useLegalMovesSettings } from '../_hooks/use-legal-moves-settings';
import { LegalMovesSetup } from './LegalMovesSetup';

type Props = {
  locale: Locale;
};

export function LegalMoves({ locale }: Props) {
  const { settings, updateSettings } = useLegalMovesSettings();

  return (
    <LegalMovesSetup
      locale={locale}
      pieceSelection={settings.pieceSelection}
      onPieceSelect={(pieceSelection) => updateSettings({ pieceSelection })}
    />
  );
}

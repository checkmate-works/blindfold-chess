'use client';

import type { ChessOpening } from '@/lib/db';

import { OpeningCard } from '@/app/[locale]/(public)/topics/openings/_components/OpeningCard';
import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  opening: ChessOpening;
  displayName: string;
  locale: string;
};

export function OpeningCardWithProvider({ opening, displayName, locale }: Props) {
  return (
    <GamePreferencesProvider>
      <OpeningCard opening={opening} displayName={displayName} locale={locale} />
    </GamePreferencesProvider>
  );
}

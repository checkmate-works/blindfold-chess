import type { ChessOpening } from '@/lib/db';

import { OpeningCard } from '@/app/[locale]/(public)/topics/openings/_components/OpeningCard';
import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

type OpeningData = Pick<ChessOpening, 'slug' | 'fen' | 'ecoCode' | 'pgn'>;

type Props = {
  opening: OpeningData;
  displayName: string;
  locale: string;
  disableLink?: boolean;
};

export function OpeningCardWithProvider({ opening, displayName, locale, disableLink }: Props) {
  return (
    <GamePreferencesProvider>
      <OpeningCard
        opening={opening}
        displayName={displayName}
        locale={locale}
        disableLink={disableLink}
      />
    </GamePreferencesProvider>
  );
}

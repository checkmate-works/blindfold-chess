'use client';

import { useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { parsePgn } from '@blindfold-chess/features/chess-core';

import { isBlackOpening } from '@/app/[locale]/(public)/topics/openings/_lib/openings';
import { OpeningCardWithProvider } from '@/app/[locale]/_components/OpeningCardWithProvider';
import type { Opening } from '@/app/[locale]/_components/OpeningSearch';
import { OpeningSearch } from '@/app/[locale]/_components/OpeningSearch';

type Props = {
  openings: Opening[];
};

export function OpeningGameForm({ openings }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('newGame.opening');
  const [selectedSlug, setSelectedSlug] = useState('');

  const selectedOpening = openings.find((o) => o.slug === selectedSlug);

  const handleStartGame = () => {
    if (!selectedOpening) return;

    const moves = parsePgn(selectedOpening.pgn);
    const params = new URLSearchParams();
    params.set('moves', JSON.stringify(moves));
    params.set('color', isBlackOpening(selectedOpening.fen) ? 'black' : 'white');
    router.push(`/${locale}/games/new/pgn?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <OpeningSearch openings={openings} selectedSlug={selectedSlug} onSelect={setSelectedSlug} />

      {selectedOpening && (
        <>
          <OpeningCardWithProvider
            opening={selectedOpening}
            displayName={selectedOpening.translatedName}
            locale={locale}
            disableLink
          />

          <Button variant="primary" fullWidth onClick={handleStartGame}>
            {t('startGame')}
          </Button>
        </>
      )}
    </div>
  );
}

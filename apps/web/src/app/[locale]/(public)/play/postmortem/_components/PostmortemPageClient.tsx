'use client';

import { type ReactElement, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { ClientBreadcrumb } from '@/app/[locale]/(public)/play/_components/ClientBreadcrumb';
import { Divider } from '@/app/[locale]/_components/Divider';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { PostmortemClient } from './PostmortemClient';

type Props = {
  locale: Locale;
};

export function PostmortemPageClient({ locale }: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations('postmortem');
  const tPlay = useTranslations('play');
  const [selectedMoveDisplay, setSelectedMoveDisplay] = useState<ReactElement | null>(null);

  // Get PGN from URL parameters
  const pgn = searchParams.get('pgn');
  const playerColor = (searchParams.get('color') as 'white' | 'black') || 'white';
  const autoOpponent = searchParams.get('autoOpponent') === 'true';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const gameId = searchParams.get('gameId');
  const skillLevel = searchParams.get('skillLevel');
  const moves = searchParams.get('moves');
  const startingFen = searchParams.get('fen') || undefined;

  // Build the play page URL with original game parameters
  const getPlayPageUrl = () => {
    const params = new URLSearchParams();
    params.set('color', playerColor);

    if (gameId) {
      params.set('gameId', gameId);
    }
    if (skillLevel) {
      params.set('skillLevel', skillLevel);
    }
    if (moves) {
      params.set('moves', moves);
    }
    if (startingFen) {
      params.set('fen', startingFen);
    }

    return `/play?${params.toString()}`;
  };

  if (!pgn) {
    return (
      <div className="text-center">
        <PageTitle>{t('title')}</PageTitle>
        <p className="text-muted-foreground mt-4">No game data provided.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle>{selectedMoveDisplay || t('title')}</PageTitle>
      <PostmortemClient
        pgn={pgn}
        playerColor={playerColor}
        autoOpponent={autoOpponent}
        initialOffset={offset}
        startingFen={startingFen}
        onSelectedMoveChange={setSelectedMoveDisplay}
      />
      <Divider />
      <ClientBreadcrumb
        items={[{ label: tPlay('title'), href: getPlayPageUrl() }, { label: t('title') }]}
        locale={locale}
      />
    </div>
  );
}

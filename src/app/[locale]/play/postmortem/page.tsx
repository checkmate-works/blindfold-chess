'use client';

import { useTranslations } from 'next-intl';
import { useParams, useSearchParams } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PageTitle } from '../../_components/PageTitle';
import { PostmortemClient } from './_components/PostmortemClient';

export default function PostmortemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as Locale;
  const t = useTranslations('postmortem');

  // Get PGN from URL parameters
  const pgn = searchParams.get('pgn');
  const playerColor = (searchParams.get('color') as 'white' | 'black') || 'white';
  const autoOpponent = searchParams.get('autoOpponent') === 'true';
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  if (!pgn) {
    return (
      <div className="text-center">
        <PageTitle>{t('title')}</PageTitle>
        <p className="text-muted-foreground mt-4">No game data provided.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
        <p className="text-muted-foreground mt-2">{t('description')}</p>
      </div>
      <PostmortemClient
        locale={locale}
        pgn={pgn}
        playerColor={playerColor}
        autoOpponent={autoOpponent}
        initialOffset={offset}
      />
    </>
  );
}

'use client';

import type { ReactNode } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Divider } from '@/app/[locale]/_components/Divider';
import { HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import type { HelpStep } from '@/app/[locale]/_components/HelpTourButton';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';

import { PostmortemClient } from './PostmortemClient';

type Props = {
  breadcrumb: ReactNode;
};

export function PostmortemPageClient({ breadcrumb }: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations('postmortem');

  // Get PGN from URL parameters
  const pgn = searchParams.get('pgn');
  const playerColor = (searchParams.get('color') as 'white' | 'black') || 'white';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const startingFen = searchParams.get('fen') || undefined;
  const gameId = searchParams.get('gameId') || undefined;

  const helpSteps: HelpStep[] = [
    {
      targetId: 'postmortem-input',
      title: t('help.input.title'),
      description: t('help.input.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'postmortem-dont-know',
      title: t('help.dontKnow.title'),
      description: t('help.dontKnow.description'),
      side: 'top',
      align: 'center',
    },
    {
      targetId: 'postmortem-settings',
      title: t('help.settings.title'),
      description: t('help.settings.description'),
      side: 'top',
      align: 'center',
    },
    {
      targetId: 'postmortem-moves',
      title: t('help.moves.title'),
      description: t('help.moves.description'),
      side: 'left',
      align: 'start',
    },
  ];

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
      <div className="flex items-center justify-center gap-2">
        <PageTitle>{t('title')}</PageTitle>
        <HelpTourButton steps={helpSteps} label={t('help.label')} />
      </div>
      <PagePanel>
        <PostmortemClient
          pgn={pgn}
          playerColor={playerColor}
          autoOpponent={false}
          initialOffset={offset}
          startingFen={startingFen}
          gameId={gameId}
        />
        {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          {breadcrumb}
        </div>
      </PagePanel>
    </div>
  );
}

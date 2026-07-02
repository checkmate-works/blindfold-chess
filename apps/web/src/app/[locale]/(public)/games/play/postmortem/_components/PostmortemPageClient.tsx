'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

import { useSearchParams } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { StatsAuthGate } from '@/app/[locale]/(public)/games/play/result/_components/StatsAuthGate';
import { Divider } from '@/app/[locale]/_components/Divider';
import { HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import type { HelpStep } from '@/app/[locale]/_components/HelpTourButton';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

import { PostmortemClient } from './PostmortemClient';
import type { PostmortemFeedback } from './PostmortemClient';

type Props = {
  breadcrumb: ReactNode;
};

export function PostmortemPageClient({ breadcrumb }: Props) {
  const searchParams = useSearchParams();
  const t = useTranslations('postmortem');
  // Recall is members-only. The sign-up CTA lives here (not at the entry point)
  // so an anonymous player reaches this screen first, then sees the prompt.
  // `isLoading` is treated as "not yet a guest" so a signed-in player never
  // flashes the gate before auth resolves.
  const { user, isLoading: isAuthLoading } = useAuth();
  const isGuest = !isAuthLoading && !user;
  const [feedback, setFeedback] = useState<PostmortemFeedback | null>(null);
  // Bumping this remounts PostmortemClient, resetting the whole review (moves,
  // log, completion) to a clean run — the "play again" action.
  const [runId, setRunId] = useState(0);
  // "Play again" must start from move 1. The review writes its progress into
  // the URL's `offset` as you play (see use-postmortem-init), so by completion
  // the URL points at the end — reusing it on remount would re-complete
  // instantly. Once the user restarts, force offset 0 and ignore the URL.
  const [forceStartOver, setForceStartOver] = useState(false);
  // The help tour explains the live review controls (input, "don't know",
  // settings, moves). Once the review is completed those panels are replaced by
  // the summary, so the tour has nothing left to point at — hide it.
  const [isCompleted, setIsCompleted] = useState(false);

  // Get PGN from URL parameters
  const pgn = searchParams.get('pgn');
  const playerColor = (searchParams.get('color') as 'white' | 'black') || 'white';
  const offset = forceStartOver ? 0 : parseInt(searchParams.get('offset') || '0', 10);
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

  // Title color follows the latest feedback tone, mirroring the play screen's
  // live status title.
  const titleToneClass =
    feedback?.tone === 'incorrect'
      ? 'text-destructive'
      : feedback?.tone === 'correct'
        ? 'text-success'
        : feedback?.tone === 'skipped'
          ? 'text-muted-foreground'
          : '';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2">
        <PageTitle>
          <span className={`truncate block ${titleToneClass}`}>
            {feedback ? feedback.text : t('title')}
          </span>
        </PageTitle>
        {!isCompleted && !isGuest && <HelpTourButton steps={helpSteps} label={t('help.label')} />}
      </div>
      <PagePanel>
        {isGuest ? (
          <StatsAuthGate title={t('authGate.title')} description={t('authGate.description')}>
            <div className="min-h-[22rem]" />
          </StatsAuthGate>
        ) : (
          <PostmortemClient
            key={runId}
            pgn={pgn}
            playerColor={playerColor}
            autoOpponent={false}
            initialOffset={offset}
            startingFen={startingFen}
            gameId={gameId}
            onFeedbackChange={setFeedback}
            onCompletedChange={setIsCompleted}
            onRestart={() => {
              setForceStartOver(true);
              setRunId((n) => n + 1);
            }}
          />
        )}
        {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
        <div className="!mt-4 space-y-4">
          <Divider />
          {breadcrumb}
        </div>
      </PagePanel>
    </div>
  );
}

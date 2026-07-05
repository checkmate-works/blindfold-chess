'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { HelpTourButton } from '@/app/[locale]/_components/HelpTourButton';
import type { HelpStep } from '@/app/[locale]/_components/HelpTourButton';
import { PageLayout } from '@/app/[locale]/_components/PageLayout';
import type { Locale } from '@/app/[locale]/_lib/types';

import { RecallClient } from './RecallClient';
import type { RecallFeedback } from './RecallClient';

type Props = {
  locale: Locale;
  pgn: string;
  moves?: AlgebraicNotation[];
  playerColor: 'white' | 'black';
  initialOffset: number;
  startingFen?: string;
  gameId?: string;
  breadcrumbItems: BreadcrumbItem[];
};

export function RecallSessionClient({
  locale,
  pgn,
  moves,
  playerColor,
  initialOffset,
  startingFen,
  gameId,
  breadcrumbItems,
}: Props) {
  const t = useTranslations('recall');
  const [feedback, setFeedback] = useState<RecallFeedback | null>(null);
  // Bumping this remounts RecallClient, resetting the whole review (moves,
  // log, completion) to a clean run — the "play again" action.
  const [runId, setRunId] = useState(0);
  // "Play again" must start from move 1. The review writes its progress into
  // the URL's `offset` as you play (see use-recall-init), so by completion
  // the URL points at the end — reusing it on remount would re-complete
  // instantly. Once the user restarts, force offset 0 and ignore the initial prop.
  const [forceStartOver, setForceStartOver] = useState(false);
  // The help tour explains the live review controls (input, "don't know",
  // settings, moves). Once the review is completed those panels are replaced by
  // the summary, so the tour has nothing left to point at — hide it.
  const [isCompleted, setIsCompleted] = useState(false);

  const effectiveOffset = forceStartOver ? 0 : initialOffset;

  const helpSteps: HelpStep[] = [
    {
      targetId: 'recall-input',
      title: t('help.input.title'),
      description: t('help.input.description'),
      side: 'bottom',
      align: 'start',
    },
    {
      targetId: 'recall-dont-know',
      title: t('help.dontKnow.title'),
      description: t('help.dontKnow.description'),
      side: 'top',
      align: 'center',
    },
    {
      targetId: 'recall-settings',
      title: t('help.settings.title'),
      description: t('help.settings.description'),
      side: 'top',
      align: 'center',
    },
    {
      targetId: 'recall-moves',
      title: t('help.moves.title'),
      description: t('help.moves.description'),
      side: 'left',
      align: 'start',
    },
  ];

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
    <PageLayout
      title={
        <span className={`truncate block ${titleToneClass}`}>
          {feedback ? feedback.text : t('title')}
        </span>
      }
      titleAction={!isCompleted && <HelpTourButton steps={helpSteps} label={t('help.label')} />}
      locale={locale}
      breadcrumb={breadcrumbItems}
    >
      <RecallClient
        key={runId}
        pgn={pgn}
        moves={moves}
        playerColor={playerColor}
        autoOpponent={false}
        initialOffset={effectiveOffset}
        startingFen={startingFen}
        gameId={gameId}
        onFeedbackChange={setFeedback}
        onCompletedChange={setIsCompleted}
        onRestart={() => {
          setForceStartOver(true);
          setRunId((n) => n + 1);
        }}
      />
    </PageLayout>
  );
}

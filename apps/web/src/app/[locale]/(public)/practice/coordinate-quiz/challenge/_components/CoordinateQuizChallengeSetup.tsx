'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge-constants';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { CoordinateQuizSettings } from '../../_components/CoordinateQuizSettings';
import type { BoardOrientation, FeedbackSpeed } from '../../_lib/types';
import { BOARD_ORIENTATIONS, FEEDBACK_SPEEDS } from '../../_lib/types';

type Props = {
  locale: Locale;
  boardOrientation: string;
  feedbackSpeed: string;
};

function parseOrientation(value: string): BoardOrientation {
  return (BOARD_ORIENTATIONS as readonly string[]).includes(value)
    ? (value as BoardOrientation)
    : 'white';
}

function parseFeedbackSpeed(value: string): FeedbackSpeed {
  return (FEEDBACK_SPEEDS as readonly string[]).includes(value)
    ? (value as FeedbackSpeed)
    : 'normal';
}

export function CoordinateQuizChallengeSetup({
  locale,
  boardOrientation: initialOrientation,
  feedbackSpeed: initialFeedbackSpeed,
}: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>(
    parseOrientation(initialOrientation)
  );
  const [feedbackSpeed, setFeedbackSpeed] = useState<FeedbackSpeed>(
    parseFeedbackSpeed(initialFeedbackSpeed)
  );

  const handleStart = () => {
    const params = new URLSearchParams({
      orientation: boardOrientation,
      feedbackSpeed,
    });
    router.push(`/${locale}/practice/coordinate-quiz/challenge/session?${params.toString()}`);
  };

  return (
    <PracticePanel className="p-6">
      <SectionTitle className="mb-4">{t('challengeSetup.title')}</SectionTitle>

      <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc list-inside">
        <li>{t('challengeSetup.timeLimit', { seconds: CHALLENGE_TIME_LIMIT })}</li>
        <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
        <li>{t('challengeSetup.leaderboard')}</li>
      </ul>

      <CoordinateQuizSettings
        boardOrientation={boardOrientation}
        feedbackSpeed={feedbackSpeed}
        onBoardOrientationChange={setBoardOrientation}
        onFeedbackSpeedChange={setFeedbackSpeed}
      />

      <Button
        onClick={handleStart}
        variant="primary"
        size="lg"
        icon={<FaPlay />}
        className="w-full mt-6"
      >
        {t('startChallenge')}
      </Button>
    </PracticePanel>
  );
}

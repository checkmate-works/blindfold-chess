'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import { StandardChallengeRules } from '@/app/[locale]/(public)/practice/(challenge)/_components/StandardChallengeRules';
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
    <ChallengeSetupShell onStart={handleStart} rules={<StandardChallengeRules t={t} />}>
      <CoordinateQuizSettings
        boardOrientation={boardOrientation}
        feedbackSpeed={feedbackSpeed}
        onBoardOrientationChange={setBoardOrientation}
        onFeedbackSpeedChange={setFeedbackSpeed}
      />
    </ChallengeSetupShell>
  );
}

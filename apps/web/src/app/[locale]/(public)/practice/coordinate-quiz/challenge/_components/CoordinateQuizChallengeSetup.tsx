'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { MISTAKE_LIMIT } from '@/lib/challenge-constants';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

const DEFAULT_TIME_LIMIT = 60;
const DEFAULT_BOARD_ORIENTATION = 'white';
const DEFAULT_FEEDBACK_SPEED = 'normal';

type Props = {
  locale: Locale;
};

export function CoordinateQuizChallengeSetup({ locale }: Props) {
  const timeLimit = DEFAULT_TIME_LIMIT;
  const boardOrientation = DEFAULT_BOARD_ORIENTATION;
  const feedbackSpeed = DEFAULT_FEEDBACK_SPEED;
  const t = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    const params = new URLSearchParams({
      timeLimit: timeLimit.toString(),
      boardOrientation,
      feedbackSpeed,
    });
    router.push(`/${locale}/practice/coordinate-quiz/challenge/session?${params.toString()}`);
  };

  return (
    <PracticePanel className="p-6">
      <SectionTitle className="mb-4">{t('challengeSetup.title')}</SectionTitle>

      <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc list-inside">
        <li>{t('challengeSetup.timeLimit', { seconds: timeLimit })}</li>
        <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
        <li>{t('challengeSetup.leaderboard')}</li>
      </ul>

      <Button
        onClick={handleStart}
        variant="primary"
        size="lg"
        icon={<FaPlay />}
        className="w-full"
      >
        {t('startChallenge')}
      </Button>
    </PracticePanel>
  );
}

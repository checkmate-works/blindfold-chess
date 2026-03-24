'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

const DEFAULT_TIME_LIMIT = 60;

type Props = {
  locale: Locale;
};

export function DiagonalQuizChallengeSetup({ locale }: Props) {
  const timeLimit = DEFAULT_TIME_LIMIT;
  const t = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    const params = new URLSearchParams({
      timeLimit: timeLimit.toString(),
    });
    router.push(`/${locale}/practice/diagonal-quiz/challenge/session?${params.toString()}`);
  };

  return (
    <PracticePanel className="p-6">
      <SectionTitle className="mb-4">{t('challengeSetup.title')}</SectionTitle>

      <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc list-inside">
        <li>{t('challengeSetup.timeLimit', { seconds: timeLimit })}</li>
        <li>{t('challengeSetup.noMistakeLimit')}</li>
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

'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

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
    <>
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
    </>
  );
}

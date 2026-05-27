'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
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
    <ChallengeSetupShell
      onStart={handleStart}
      rules={
        <>
          <li>{t('challengeSetup.timeLimit', { seconds: timeLimit })}</li>
          <li>{t('challengeSetup.noMistakeLimit')}</li>
          <li>{t('challengeSetup.leaderboard')}</li>
        </>
      }
    />
  );
}

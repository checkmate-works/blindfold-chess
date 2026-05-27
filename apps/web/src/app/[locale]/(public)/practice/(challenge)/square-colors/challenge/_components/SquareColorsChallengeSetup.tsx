'use client';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ChallengeSetupShell } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeSetupShell';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function SquareColorsChallengeSetup({ locale }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    router.push(`/${locale}/practice/square-colors/challenge/session`);
  };

  return (
    <ChallengeSetupShell
      onStart={handleStart}
      rules={
        <>
          <li>{t('challengeSetup.timeLimit', { seconds: 60 })}</li>
          <li>{t('challengeSetup.mistakeLimit', { count: MISTAKE_LIMIT })}</li>
          <li>{t('challengeSetup.leaderboard')}</li>
        </>
      }
    />
  );
}

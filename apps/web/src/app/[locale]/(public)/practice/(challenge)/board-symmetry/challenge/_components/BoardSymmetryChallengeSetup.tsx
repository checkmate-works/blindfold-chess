'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function BoardSymmetryChallengeSetup({ locale }: Props) {
  const t = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    router.push(`/${locale}/practice/board-symmetry/challenge/session`);
  };

  return (
    <>
      <SectionTitle className="mb-4">{t('challengeSetup.title')}</SectionTitle>

      <ul className="mb-6 space-y-2 text-sm text-muted-foreground list-disc list-inside">
        <li>{t('challengeSetup.timeLimit', { seconds: 60 })}</li>
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
    </>
  );
}

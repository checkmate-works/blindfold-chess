'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function SquareColorsSetup({ locale }: Props) {
  const t = useTranslations('practice.squareColors');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    router.push(`/${locale}/practice/square-colors/training#square-colors-training-session`);
  };

  return (
    <div>
      <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
      </div>

      <Button
        onClick={handleStart}
        variant="secondary"
        size="lg"
        icon={<FaPlay />}
        className="w-full"
      >
        {tp('startTraining')}
      </Button>
      <Button
        onClick={() => router.push(`/${locale}/practice/square-colors/challenge/session`)}
        variant="primary"
        size="lg"
        icon={<FaPlay />}
        className="w-full mt-3"
      >
        {tp('startChallenge')}
      </Button>
    </div>
  );
}

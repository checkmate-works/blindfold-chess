'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

type Props = {
  locale: Locale;
};

export default function BoardSymmetrySettings({ locale }: Props) {
  const t = useTranslations('practice.boardSymmetry');
  const tSettings = useTranslations('practice.settings');
  const tSquareColors = useTranslations('practice.squareColors'); // For re-using "seconds" label

  const router = useRouter();
  const [timeLimit, setTimeLimit] = useState(60);

  const handleStart = () => {
    router.push(
      `/${locale}/practice/board-symmetry/session?timeLimit=${timeLimit}#board-symmetry-session`
    );
  };

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <SectionTitle className="mb-4">{tSettings('title')}</SectionTitle>

        <div className="mb-6">
          <TimeSlider
            timeLimit={timeLimit}
            onTimeLimitChange={setTimeLimit}
            labels={{
              timeLimit: tSettings('timeLimit'),
              seconds: tSquareColors('seconds'),
            }}
          />
        </div>

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {tSettings('start')}
        </Button>
      </div>

      <div className="mt-8 space-y-4">
        <SectionTitle>{tSquareColors('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/coordinates/board-symmetry"
          icon="🧩"
          title={t('viewArticle')}
          description={t('articleDescription')}
          locale={locale}
        />
      </div>
    </div>
  );
}

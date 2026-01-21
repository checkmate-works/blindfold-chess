'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

type Props = {
  locale: Locale;
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
};

export function SquareColorsSetup({ locale, timeLimit, onTimeLimitChange }: Props) {
  const t = useTranslations('practice.squareColors');
  const router = useRouter();

  const handleStart = () => {
    router.push(`/${locale}/practice/square-colors/session?timeLimit=${timeLimit}`);
  };

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <TimeSlider
            timeLimit={timeLimit}
            onTimeLimitChange={onTimeLimitChange}
            labels={{
              timeLimit: t('timeLimit'),
              seconds: t('seconds'),
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
          {t('start')}
        </Button>
      </div>

      <div className="mt-8 space-y-4">
        <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/square-colors"
          icon="🎨"
          title={t('viewArticle')}
          description={t('articleDescription')}
          locale={locale}
        />
      </div>
    </div>
  );
}

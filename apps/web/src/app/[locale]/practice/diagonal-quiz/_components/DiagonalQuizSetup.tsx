'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { BetaNotice, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

type Props = {
  locale: Locale;
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
};

export function DiagonalQuizSetup({ locale, timeLimit, onTimeLimitChange }: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const router = useRouter();

  const handleStart = () => {
    router.push(
      `/${locale}/practice/diagonal-quiz/session?timeLimit=${timeLimit}#diagonal-quiz-session`
    );
  };

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

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
    </div>
  );
}

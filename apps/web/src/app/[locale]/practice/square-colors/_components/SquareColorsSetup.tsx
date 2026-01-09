'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

type Props = {
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
  onStart: () => void;
};

export function SquareColorsSetup({ timeLimit, onTimeLimitChange, onStart }: Props) {
  const t = useTranslations('practice.squareColors');
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
          onClick={onStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full rounded-lg font-semibold"
        >
          {t('start')}
        </Button>
      </div>
    </div>
  );
}

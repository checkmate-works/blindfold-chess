'use client';

import { useTranslations } from 'next-intl';
import { SectionTitle, PrimaryButton } from '@/app/[locale]/_components';
import { TimeSlider } from '../../_components/TimeSlider';

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

        <PrimaryButton onClick={onStart}>{t('start')}</PrimaryButton>
      </div>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { SegmentedControl } from '@/app/[locale]/practice/_components/SegmentedControl';
import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

import type { PracticeMode } from '../_lib/types';

type Props = {
  locale: Locale;
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
};

export function SquareColorsSetup({
  locale,
  timeLimit,
  onTimeLimitChange,
  mode,
  onModeChange,
}: Props) {
  const t = useTranslations('practice.squareColors');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    if (mode === 'training') {
      router.push(`/${locale}/practice/square-colors/training#square-colors-training-session`);
    } else {
      router.push(
        `/${locale}/practice/square-colors/challenge?timeLimit=${timeLimit}#square-colors-challenge`
      );
    }
  };

  const modeOptions: { value: PracticeMode; label: string }[] = [
    { value: 'timed', label: tp('modeTimed') },
    { value: 'training', label: tp('modeTraining') },
  ];

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <SegmentedControl options={modeOptions} value={mode} onChange={onModeChange} />
        </div>

        {mode === 'timed' && (
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
        )}

        {mode === 'training' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
          </div>
        )}

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full"
        >
          {mode === 'training' ? tp('startTraining') : t('start')}
        </Button>
      </div>

      <div className="mt-8 space-y-4">
        <SectionTitle>{t('requiredKnowledge')}</SectionTitle>
        <CardLink
          href="/learn/coordinates/square-colors"
          icon="🎨"
          title={t('viewArticle')}
          description={t('articleDescription')}
          locale={locale}
        />
      </div>
    </div>
  );
}

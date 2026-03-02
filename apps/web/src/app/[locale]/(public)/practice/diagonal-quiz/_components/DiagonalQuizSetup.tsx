'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { PracticeMode } from '@blindfold-chess/features/common';
import { FaPlay } from 'react-icons/fa';

import { BetaNotice, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';
import { SegmentedControl } from '@/app/[locale]/practice/_components/SegmentedControl';
import { TimeSlider } from '@/app/[locale]/practice/_components/TimeSlider';

import { DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY } from './DiagonalQuizTutorialSkipLink';

type Props = {
  locale: Locale;
  timeLimit: number;
  onTimeLimitChange: (value: number) => void;
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
};

export function DiagonalQuizSetup({
  locale,
  timeLimit,
  onTimeLimitChange,
  mode,
  onModeChange,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    if (mode === 'training') {
      router.push(`/${locale}/practice/diagonal-quiz/training#diagonal-quiz-training-session`);
    } else {
      router.push(
        `/${locale}/practice/diagonal-quiz/challenge?timeLimit=${timeLimit}#diagonal-quiz-session`
      );
    }
  };

  const handleViewTutorial = () => {
    localStorage.removeItem(DIAGONAL_QUIZ_TUTORIAL_SKIPPED_KEY);
    router.push(`/${locale}/practice/diagonal-quiz/tutorial`);
  };

  const modeOptions: { value: PracticeMode; label: string }[] = [
    { value: 'timed', label: tp('modeTimed') },
    { value: 'training', label: tp('modeTraining') },
  ];

  return (
    <div>
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

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

        <div className="flex justify-center mt-6">
          <button
            onClick={handleViewTutorial}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            {t('tutorial.viewTutorial')}
          </button>
        </div>
      </div>
    </div>
  );
}

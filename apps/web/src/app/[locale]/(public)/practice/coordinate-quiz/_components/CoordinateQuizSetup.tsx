'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { SegmentedControl } from '@/app/[locale]/(public)/practice/_components/SegmentedControl';
import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed, PracticeMode } from '../_lib/types';
import { CoordinateQuizSettings } from './CoordinateQuizSettings';

type Props = {
  locale: Locale;
  timeLimit: number;
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  mode: PracticeMode;
  onTimeLimitChange: (value: number) => void;
  onBoardOrientationChange: (value: BoardOrientation) => void;
  onFeedbackSpeedChange: (value: FeedbackSpeed) => void;
  onModeChange: (mode: PracticeMode) => void;
};

export function CoordinateQuizSetup({
  locale,
  timeLimit,
  boardOrientation,
  feedbackSpeed,
  mode,
  onTimeLimitChange,
  onBoardOrientationChange,
  onFeedbackSpeedChange,
  onModeChange,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    if (mode === 'training') {
      router.push(
        `/${locale}/practice/coordinate-quiz/training?boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#coordinate-quiz-training-session`
      );
    } else {
      router.push(
        `/${locale}/practice/coordinate-quiz/challenge?timeLimit=${timeLimit}&boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#quiz-session`
      );
    }
  };

  const modeOptions: { value: PracticeMode; label: string }[] = [
    { value: 'training', label: tp('modeTraining') },
    { value: 'timed', label: tp('modeTimed') },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <SegmentedControl options={modeOptions} value={mode} onChange={onModeChange} />
        </div>

        {mode === 'training' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
          </div>
        )}

        {mode === 'timed' && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{tp('challengeDescription')}</p>
          </div>
        )}

        <CoordinateQuizSettings
          timeLimit={timeLimit}
          boardOrientation={boardOrientation}
          feedbackSpeed={feedbackSpeed}
          onTimeLimitChange={onTimeLimitChange}
          onBoardOrientationChange={onBoardOrientationChange}
          onFeedbackSpeedChange={onFeedbackSpeedChange}
          showTimeSlider={false}
        />

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {mode === 'training' ? tp('startTraining') : t('start')}
        </Button>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mt-8 space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardLink
            href="/learn/coordinates/coordinate-confusion"
            icon="🔄"
            title={t('articles.coordinateConfusion.title')}
            description={t('articles.coordinateConfusion.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/coordinates/anchor-squares"
            icon="⚓"
            title={t('articles.anchorSquares.title')}
            description={t('articles.anchorSquares.description')}
            locale={locale}
          />
          <CardLink
            href="/learn/notation/algebraic-notation"
            icon="🔤"
            title={t('articles.algebraicNotation.title')}
            description={t('articles.algebraicNotation.description')}
            locale={locale}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { PracticeHowToPlayCard } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeHowToPlayCard';
import { PracticeSetupActions } from '@/app/[locale]/(public)/practice/(challenge)/_components/PracticeSetupActions';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { CoordinateQuizBoard } from './CoordinateQuizBoard';
import { CoordinateQuizSettings } from './CoordinateQuizSettings';

const noop = () => {};

type Props = {
  locale: Locale;
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  onBoardOrientationChange: (value: BoardOrientation) => void;
  onFeedbackSpeedChange: (value: FeedbackSpeed) => void;
};

export function CoordinateQuizSetup({
  locale,
  boardOrientation,
  feedbackSpeed,
  onBoardOrientationChange,
  onFeedbackSpeedChange,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');

  const settingsQuery = `orientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}`;

  return (
    <div>
      <PracticeHowToPlayCard title={t('howToPlayTitle')} description={t('howToPlayDescription')}>
        <div className="relative inline-block w-full max-w-[240px] mx-auto">
          <CoordinateQuizBoard orientation="white" onSquareClick={noop} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              e4
            </span>
          </div>
        </div>
      </PracticeHowToPlayCard>

      <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

      <CoordinateQuizSettings
        boardOrientation={boardOrientation}
        feedbackSpeed={feedbackSpeed}
        onBoardOrientationChange={onBoardOrientationChange}
        onFeedbackSpeedChange={onFeedbackSpeedChange}
      />

      <PracticeSetupActions
        locale={locale}
        moduleSlug="coordinate-quiz"
        settingsQuery={settingsQuery}
        buttonClassName="w-full mt-6"
        challengeTourId="coordinate-quiz-challenge"
        trainingTourId="coordinate-quiz-training"
      />
    </div>
  );
}

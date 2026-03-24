'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { PracticePanel } from '@/app/[locale]/(public)/practice/_components/PracticePanel';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { CoordinateQuizSettings } from './CoordinateQuizSettings';

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
  const tp = useTranslations('practice');
  const router = useRouter();

  const handleStart = () => {
    router.push(
      `/${locale}/practice/coordinate-quiz/training?boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#coordinate-quiz-training-session`
    );
  };

  return (
    <div>
      <PracticePanel className="p-6">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">{tp('trainingDescription')}</p>
        </div>

        <CoordinateQuizSettings
          boardOrientation={boardOrientation}
          feedbackSpeed={feedbackSpeed}
          onBoardOrientationChange={onBoardOrientationChange}
          onFeedbackSpeedChange={onFeedbackSpeedChange}
        />

        <Button
          onClick={handleStart}
          variant="secondary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {tp('startTraining')}
        </Button>
        <Button
          onClick={() => router.push(`/${locale}/practice/coordinate-quiz/challenge/session`)}
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          className="w-full mt-3"
        >
          {tp('startChallenge')}
        </Button>
      </PracticePanel>
    </div>
  );
}

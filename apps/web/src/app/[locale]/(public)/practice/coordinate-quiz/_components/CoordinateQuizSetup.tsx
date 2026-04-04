'use client';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

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
  const tp = useTranslations('practice');

  const settingsQuery = `orientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}`;

  return (
    <div>
      <SectionTitle className="mb-4">{t('howToPlayTitle')}</SectionTitle>
      <div className="mb-6 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">{t('howToPlayDescription')}</p>
        <div className="relative inline-block w-full max-w-[240px] mx-auto">
          <CoordinateQuizBoard orientation="white" onSquareClick={noop} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-4xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              e4
            </span>
          </div>
        </div>
      </div>

      <SectionTitle className="mb-4">{t('settings')}</SectionTitle>

      <CoordinateQuizSettings
        boardOrientation={boardOrientation}
        feedbackSpeed={feedbackSpeed}
        onBoardOrientationChange={onBoardOrientationChange}
        onFeedbackSpeedChange={onFeedbackSpeedChange}
      />

      <Link href={`/${locale}/practice/coordinate-quiz/challenge/session?${settingsQuery}`}>
        <Button asChild variant="primary" size="lg" icon={<FaPlay />} className="w-full mt-6">
          {tp('startChallenge')}
        </Button>
      </Link>
      <div className="mt-4 text-center">
        <Link
          href={`/${locale}/practice/coordinate-quiz/training?${settingsQuery}#coordinate-quiz-training-session`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tp('switchToTraining')}
        </Link>
      </div>
    </div>
  );
}

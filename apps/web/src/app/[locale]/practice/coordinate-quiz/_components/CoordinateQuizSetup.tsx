'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { FaPlay } from 'react-icons/fa';

import { CardLink, SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { BoardOrientation, FeedbackSpeed } from '../_lib/types';
import { CoordinateQuizSettings } from './CoordinateQuizSettings';

type Props = {
  locale: Locale;
  timeLimit: number;
  boardOrientation: BoardOrientation;
  feedbackSpeed: FeedbackSpeed;
  onTimeLimitChange: (value: number) => void;
  onBoardOrientationChange: (value: BoardOrientation) => void;
  onFeedbackSpeedChange: (value: FeedbackSpeed) => void;
};

export function CoordinateQuizSetup({
  locale,
  timeLimit,
  boardOrientation,
  feedbackSpeed,
  onTimeLimitChange,
  onBoardOrientationChange,
  onFeedbackSpeedChange,
}: Props) {
  const t = useTranslations('practice.coordinateQuiz');
  const router = useRouter();

  const handleStart = () => {
    router.push(
      `/${locale}/practice/coordinate-quiz/session?timeLimit=${timeLimit}&boardOrientation=${boardOrientation}&feedbackSpeed=${feedbackSpeed}#quiz-session`
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mb-8">
        <SectionTitle className="text-xl mb-4">{t('settings')}</SectionTitle>

        <CoordinateQuizSettings
          timeLimit={timeLimit}
          boardOrientation={boardOrientation}
          feedbackSpeed={feedbackSpeed}
          onTimeLimitChange={onTimeLimitChange}
          onBoardOrientationChange={onBoardOrientationChange}
          onFeedbackSpeedChange={onFeedbackSpeedChange}
        />

        <Button
          onClick={handleStart}
          variant="primary"
          size="lg"
          className="w-full mt-6"
          icon={<FaPlay />}
        >
          {t('start')}
        </Button>
      </div>

      <div className="space-y-4">
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

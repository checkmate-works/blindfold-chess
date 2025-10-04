'use client';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  score: {
    correct: number;
    total: number;
    accuracy: number;
    timeElapsed: number; // in seconds
    averageTime: number; // in seconds
  };
  onTryAgain: () => void;
  locale: Locale;
  labels: {
    correctAnswers: string;
    accuracy: string;
    timeTaken: string;
    averageTime: string;
    tryAgain: string;
    morePractice: string;
  };
};

export function PracticeResult({ score, onTryAgain, locale, labels }: Props) {
  const t = useTranslations('practice');
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAverageTime = (seconds: number) => {
    const formatted = seconds.toFixed(1);
    return t('secondsFormat', { seconds: formatted });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-xl shadow-sm border border-border p-8">
        <SectionTitle>{t('result')}</SectionTitle>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {score.correct}/{score.total}
            </div>
            <div className="text-sm text-muted-foreground">{labels.correctAnswers}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {score.accuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">{labels.accuracy}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {formatTime(score.timeElapsed)}
            </div>
            <div className="text-sm text-muted-foreground">{labels.timeTaken}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-foreground">
              {formatAverageTime(score.averageTime)}
            </div>
            <div className="text-sm text-muted-foreground">{labels.averageTime}</div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={onTryAgain}
            className="w-full bg-foreground hover:bg-foreground/90 text-background font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {labels.tryAgain}
          </button>
          <Link
            href="/practice"
            locale={locale}
            className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-3 px-6 rounded-xl transition-colors text-center"
          >
            {labels.morePractice}
          </Link>
        </div>
      </div>
    </div>
  );
}
